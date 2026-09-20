/* =========================================================
   AI CẨM TRUNG V2.3 — app.js
   GitHub Pages -> Cloudflare Worker -> Workers AI

   V2.3:
   - Giữ nguyên FAQ-first
   - Kết nối Worker V2.2
   - Nhận dữ liệu procedure từ Worker
   - Hiển thị nút Cổng Dịch vụ công Quốc gia
   - Không hiển thị URL TTHC dài trong nội dung chat
   - Không chứa API key
   ========================================================= */

const AI_CONFIG = {
  endpoint: "https://ai-cam-trung-api.phamthoanubnd.workers.dev/api/chat",
  enabled: true,
  timeout: 30000
};

const FAQ_CONFIG = {
  url: "./faq.json"
};

let FAQ_DATA = [];
let FAQ_READY = false;


/* =========================================================
   GỢI Ý CÂU HỎI THEO LĨNH VỰC
   ========================================================= */

const CATEGORY_SUGGESTIONS = {
  "Thủ tục hành chính": [
    "Tôi muốn thực hiện thủ tục hành chính trực tuyến thì làm thế nào?",
    "Tôi muốn tra cứu tình trạng hồ sơ của mình.",
    "Tôi cần liên hệ bộ phận tiếp nhận hồ sơ như thế nào?"
  ],

  "Hộ tịch": [
    "Tôi muốn đăng ký khai sinh cho con thì cần làm gì?",
    "Đăng ký kết hôn cần chuẩn bị giấy tờ gì?",
    "Tôi muốn xin giấy xác nhận tình trạng hôn nhân."
  ],

  "Đất đai": [
    "Tôi muốn làm thủ tục cấp giấy chứng nhận quyền sử dụng đất.",
    "Tôi muốn hỏi về thủ tục chuyển nhượng quyền sử dụng đất.",
    "Tôi cần liên hệ bộ phận nào để hỏi về đất đai?"
  ],

  "Chính sách xã hội": [
    "Tôi muốn hỏi về chính sách hỗ trợ hộ nghèo.",
    "Tôi muốn hỏi về chế độ người có công.",
    "Tôi muốn hỏi về trợ cấp xã hội."
  ],

  "Giáo dục": [
    "Tôi muốn hỏi thông tin tuyển sinh trên địa bàn xã.",
    "Tôi cần liên hệ trường học như thế nào?",
    "Tôi muốn hỏi về hồ sơ nhập học."
  ],

  "Y tế": [
    "Tôi muốn hỏi thông tin về trạm y tế xã.",
    "Tôi muốn hỏi về bảo hiểm y tế.",
    "Tôi muốn hỏi về lịch tiêm chủng."
  ],

  "Chuyển đổi số": [
    "Tôi muốn cài đặt ứng dụng i-Hà Tĩnh.",
    "Tôi muốn sử dụng dịch vụ công trực tuyến.",
    "Tôi muốn đăng ký tài khoản VNeID."
  ],

  "Doanh nghiệp": [
    "Tôi muốn đăng ký hộ kinh doanh thì cần làm gì?",
    "Tôi muốn hỏi thủ tục liên quan đến doanh nghiệp.",
    "Tôi có thể nộp hồ sơ kinh doanh trực tuyến không?"
  ],

  "Nông nghiệp": [
    "Tôi muốn hỏi về hỗ trợ sản xuất nông nghiệp.",
    "Tôi muốn hỏi về chăn nuôi trên địa bàn.",
    "Tôi cần liên hệ bộ phận nào về nông nghiệp?"
  ],

  "Phản ánh, kiến nghị": [
    "Tôi muốn gửi phản ánh, kiến nghị đến địa phương.",
    "Tôi muốn phản ánh một vấn đề ở khu dân cư.",
    "Tôi có thể theo dõi kết quả phản ánh như thế nào?"
  ]
};


/* =========================================================
   CHUẨN HÓA VĂN BẢN
   ========================================================= */

function normalizeText(text = "") {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}


/* =========================================================
   TẢI FAQ
   ========================================================= */

async function loadFAQ() {
  try {
    const r = await fetch(
      FAQ_CONFIG.url,
      {
        cache: "no-store"
      }
    );

    if (!r.ok) {
      throw new Error(
        `FAQ HTTP ${r.status}`
      );
    }

    const data = await r.json();

    FAQ_DATA =
      Array.isArray(data)
        ? data
        : Array.isArray(data.faq)
          ? data.faq
          : Array.isArray(data.questions)
            ? data.questions
            : [];

    FAQ_READY = true;

    console.log(
      `AI Cẩm Trung: đã tải ${FAQ_DATA.length} FAQ.`
    );

  } catch (e) {

    console.warn(
      "Chưa tải được faq.json. Website vẫn có thể dùng AI:",
      e
    );

    FAQ_DATA = [];
    FAQ_READY = false;
  }
}


/* =========================================================
   TÍNH ĐIỂM FAQ
   ========================================================= */

function faqScore(question, item) {

  const q =
    normalizeText(question);

  const qt =
    normalizeText(
      item.question ||
      item.q ||
      item.title ||
      ""
    );

  const keys =
    Array.isArray(item.keywords)
      ? item.keywords.map(normalizeText)
      : [];

  if (!qt) {
    return 0;
  }

  let score =
    q === qt
      ? 100
      : 0;

  if (
    q.includes(qt) ||
    qt.includes(q)
  ) {
    score += 60;
  }

  const qw =
    new Set(
      q
        .split(" ")
        .filter(x => x.length >= 2)
    );

  const tw =
    new Set(
      qt
        .split(" ")
        .filter(x => x.length >= 2)
    );

  for (const word of qw) {

    if (tw.has(word)) {
      score += 5;
    }

    if (
      keys.some(
        k =>
          k.includes(word) ||
          word.includes(k)
      )
    ) {
      score += 4;
    }
  }

  return score;
}


/* =========================================================
   TÌM FAQ PHÙ HỢP
   ========================================================= */

function findBestFAQ(question) {

  if (!FAQ_READY) {
    return null;
  }

  let best = null;
  let bestScore = 0;

  for (const item of FAQ_DATA) {

    const score =
      faqScore(
        question,
        item
      );

    if (score > bestScore) {

      best = item;
      bestScore = score;
    }
  }

  return (
    best &&
    bestScore >= 35
  )
    ? best
    : null;
}


/* =========================================================
   LẤY CÂU TRẢ LỜI FAQ
   ========================================================= */

function faqAnswer(item) {

  return (
    item.answer ||
    item.a ||
    item.response ||
    item.content ||
    ""
  );
}


/* =========================================================
   CÂU HỎI GỢI Ý FAQ
   ========================================================= */

function faqFollowups(item) {

  const v =
    item.followups ||
    item.suggestions ||
    item.related_questions ||
    [];

  return Array.isArray(v)
    ? v.slice(0, 3)
    : [];
}


/* =========================================================
   NHẬN DIỆN LĨNH VỰC
   ========================================================= */

function detectCategory(question) {

  const q =
    normalizeText(question);

  const groups = [

    [
      "Thủ tục hành chính",
      [
        "thu tuc",
        "ho so",
        "dich vu cong",
        "nop ho so",
        "ket qua"
      ]
    ],

    [
      "Hộ tịch",
      [
        "khai sinh",
        "khai tu",
        "ket hon",
        "ho tich",
        "tinh trang hon nhan"
      ]
    ],

    [
      "Đất đai",
      [
        "dat dai",
        "so do",
        "giay chung nhan",
        "chuyen nhuong dat",
        "cap dat"
      ]
    ],

    [
      "Chính sách xã hội",
      [
        "bao tro",
        "nguoi co cong",
        "ho ngheo",
        "tro cap",
        "chinh sach"
      ]
    ],

    [
      "Giáo dục",
      [
        "truong hoc",
        "hoc sinh",
        "giao vien",
        "tuyen sinh",
        "mam non",
        "tieu hoc",
        "thcs"
      ]
    ],

    [
      "Y tế",
      [
        "tram y te",
        "y te",
        "bao hiem y te",
        "kham benh",
        "tiem chung"
      ]
    ],

    [
      "Chuyển đổi số",
      [
        "chuyen doi so",
        "i ha tinh",
        "i-hatinh",
        "vneid",
        "binh dan hoc vu so"
      ]
    ],

    [
      "Doanh nghiệp",
      [
        "doanh nghiep",
        "kinh doanh",
        "ho kinh doanh",
        "dang ky kinh doanh"
      ]
    ],

    [
      "Nông nghiệp",
      [
        "nong nghiep",
        "chan nuoi",
        "trong trot",
        "nong dan"
      ]
    ],

    [
      "Phản ánh, kiến nghị",
      [
        "phan anh",
        "kien nghi",
        "phan anh hien truong",
        "gop y"
      ]
    ]
  ];

  for (
    const [category, keys]
    of groups
  ) {

    if (
      keys.some(
        k =>
          q.includes(
            normalizeText(k)
          )
      )
    ) {
      return category;
    }
  }

  return "Chung";
}


/* =========================================================
   GỌI CLOUDFLARE WORKER
   ========================================================= */

async function callAI(
  question,
  extra = {}
) {

  if (!AI_CONFIG.enabled) {
    throw new Error(
      "AI đang tắt."
    );
  }

  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () => controller.abort(),
      AI_CONFIG.timeout
    );

  try {

    const response =
      await fetch(
        AI_CONFIG.endpoint,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              question,

              category:
                extra.category ||
                detectCategory(
                  question
                ),

              intent:
                extra.intent ||
                "tra_cuu",

              context:
                extra.context ||
                "",

              faq:
                extra.faq ||
                ""
            }),

          signal:
            controller.signal
        }
      );

    const raw =
      await response.text();

    let data;

    try {

      data =
        JSON.parse(raw);

    } catch {

      throw new Error(
        `Worker trả về dữ liệu không hợp lệ: ${raw.slice(0, 200)}`
      );
    }

    if (
      !response.ok ||
      data.error
    ) {

      throw new Error(
        data.error ||
        `Worker HTTP ${response.status}`
      );
    }

    /*
       V2.3:
       Nhận thêm source,
       intent và procedure
       từ Worker V2.2.
    */

    return {

      answer:
        data.answer ||
        data.message ||
        data.response ||
        "Xin lỗi, tôi chưa có câu trả lời phù hợp.",

      category:
        data.category ||
        extra.category ||
        "Chung",

      followups:
        Array.isArray(
          data.followups
        )
          ? data.followups.slice(0, 3)
          : [],

      source:
        data.source ||
        "",

      intent:
        data.intent ||
        "",

      procedure:
        data.procedure ||
        null
    };

  } finally {

    clearTimeout(timer);
  }
}


/* =========================================================
   TÌM Ô NHẬP
   ========================================================= */

function findInput() {

  return document.querySelector(
    "#user-input"
  );
}


/* =========================================================
   TÌM KHUNG CHAT
   ========================================================= */

function findMessagesContainer() {

  return document.querySelector(
    "#chat-messages"
  );
}


/* =========================================================
   LÀM SẠCH NỘI DUNG TTHC

   Worker V2.2 hiện có thể đưa URL vào answer.
   V2.3 sẽ loại bỏ URL dài đó khỏi khung chat
   vì đã có nút riêng.
   ========================================================= */

function cleanProcedureAnswer(
  text,
  procedure
) {

  if (
    !procedure ||
    !procedure.url
  ) {
    return text;
  }

  const url =
    String(
      procedure.url
    ).trim();

  let result =
    String(
      text || ""
    );

  /*
     Xóa dòng dạng:
     Xem thủ tục: https://...
  */

  result =
    result
      .split("\n")
      .filter(line => {

        const trimmed =
          line.trim();

        if (
          trimmed.startsWith(
            "Xem thủ tục:"
          )
        ) {
          return false;
        }

        if (
          trimmed === url
        ) {
          return false;
        }

        return true;
      })
      .join("\n");

  /*
     Trường hợp URL xuất hiện
     riêng trong nội dung.
  */

  if (url) {

    result =
      result
        .split(url)
        .join("");
  }

  /*
     Xóa khoảng trắng thừa.
  */

  result =
    result
      .replace(
        /\n{3,}/g,
        "\n\n"
      )
      .trim();

  return result;
}


/* =========================================================
   KIỂM TRA URL CỔNG DVC

   Chỉ tạo nút khi Worker trả về URL HTTPS
   thuộc dichvucong.gov.vn.
   ========================================================= */

function isOfficialDvcUrl(url) {

  if (!url) {
    return false;
  }

  try {

    const parsed =
      new URL(url);

    const host =
      parsed.hostname
        .toLowerCase();

    return (
      parsed.protocol ===
        "https:" &&
      (
        host ===
          "dichvucong.gov.vn" ||

        host.endsWith(
          ".dichvucong.gov.vn"
        )
      )
    );

  } catch {

    return false;
  }
}


/* =========================================================
   TẠO NÚT CỔNG DỊCH VỤ CÔNG
   ========================================================= */

function createDvcButton(
  procedure
) {

  if (
    !procedure ||
    !isOfficialDvcUrl(
      procedure.url
    )
  ) {
    return null;
  }

  const actionBox =
    document.createElement(
      "div"
    );

  actionBox.className =
    "tthc-action-box";

  /*
     Có style dự phòng để nút
     hiển thị đẹp ngay cả khi
     chưa sửa style.css.
  */

  actionBox.style.marginTop =
    "12px";

  const link =
    document.createElement(
      "a"
    );

  link.className =
    "tthc-dvc-btn";

  link.href =
    procedure.url;

  link.target =
    "_blank";

  link.rel =
    "noopener noreferrer";

  link.textContent =
    "🔎 Xem thủ tục trên Cổng Dịch vụ công Quốc gia";

  /*
     Style dự phòng.
     Sau này có thể chuyển toàn bộ
     sang style.css.
  */

  link.style.display =
    "inline-flex";

  link.style.alignItems =
    "center";

  link.style.justifyContent =
    "center";

  link.style.padding =
    "10px 14px";

  link.style.borderRadius =
    "10px";

  link.style.textDecoration =
    "none";

  link.style.fontWeight =
    "600";

  link.style.lineHeight =
    "1.4";

  link.style.border =
    "1px solid currentColor";

  link.style.cursor =
    "pointer";

  link.style.maxWidth =
    "100%";

  link.style.boxSizing =
    "border-box";

  actionBox.appendChild(
    link
  );

  return actionBox;
}


/* =========================================================
   HIỂN THỊ TIN NHẮN
   ========================================================= */

function appendMessage(
  text,
  type = "bot",
  followups = [],
  procedure = null
) {

  const container =
    findMessagesContainer();

  if (!container) {
    return;
  }

  const wrapper =
    document.createElement(
      "div"
    );

  wrapper.className =
    `message ${type}-message`;

  /*
     Avatar AI
  */

  if (
    type === "bot"
  ) {

    const avatar =
      document.createElement(
        "div"
      );

    avatar.className =
      "avatar";

    avatar.textContent =
      "AI";

    wrapper.appendChild(
      avatar
    );
  }

  /*
     Bong bóng chat
  */

  const bubble =
    document.createElement(
      "div"
    );

  bubble.className =
    "bubble";

  /*
     Tên AI
  */

  if (
    type === "bot"
  ) {

    const name =
      document.createElement(
        "div"
      );

    name.className =
      "message-name";

    name.textContent =
      "AI Cẩm Trung";

    bubble.appendChild(
      name
    );
  }

  /*
     Nội dung
  */

  const content =
    document.createElement(
      "div"
    );

  content.className =
    "message-content";

  let displayText =
    text;

  /*
     Nếu là TTHC:
     loại URL dài khỏi câu trả lời.
  */

  if (
    type === "bot" &&
    procedure
  ) {

    displayText =
      cleanProcedureAnswer(
        text,
        procedure
      );
  }

  /*
     Dùng textContent để tránh
     chèn HTML không an toàn.
  */

  content.textContent =
    displayText;

  bubble.appendChild(
    content
  );

  /*
     Nếu Worker trả về TTHC
     có URL chính thức:
     tạo nút Cổng DVC.
  */

  if (
    type === "bot" &&
    procedure
  ) {

    const dvcButton =
      createDvcButton(
        procedure
      );

    if (dvcButton) {

      bubble.appendChild(
        dvcButton
      );
    }
  }

  /*
     Câu hỏi gợi ý
  */

  if (
    Array.isArray(
      followups
    ) &&
    followups.length
  ) {

    const box =
      document.createElement(
        "div"
      );

    box.className =
      "followup-suggestions";

    followups.forEach(q => {

      const btn =
        document.createElement(
          "button"
        );

      btn.type =
        "button";

      btn.className =
        "followup-btn";

      btn.textContent =
        q;

      btn.addEventListener(
        "click",
        () =>
          sendQuestion(q)
      );

      box.appendChild(
        btn
      );
    });

    bubble.appendChild(
      box
    );
  }

  wrapper.appendChild(
    bubble
  );

  container.appendChild(
    wrapper
  );

  container.scrollTop =
    container.scrollHeight;
}


/* =========================================================
   TRẠNG THÁI ĐANG TRA CỨU
   ========================================================= */

function setLoading(on) {

  const button =
    document.querySelector(
      "#send-btn"
    );

  if (button) {

    button.disabled =
      on;

    const label =
      button.querySelector(
        "span:first-child"
      );

    if (label) {

      label.textContent =
        on
          ? "Đang trả lời..."
          : "Gửi";
    }
  }

  const container =
    findMessagesContainer();

  if (!container) {
    return;
  }

  const old =
    container.querySelector(
      ".ai-loading-message"
    );

  if (
    on &&
    !old
  ) {

    const wrapper =
      document.createElement(
        "div"
      );

    wrapper.className =
      "message bot-message ai-loading-message";

    const avatar =
      document.createElement(
        "div"
      );

    avatar.className =
      "avatar";

    avatar.textContent =
      "AI";

    const bubble =
      document.createElement(
        "div"
      );

    bubble.className =
      "bubble";

    const content =
      document.createElement(
        "div"
      );

    content.className =
      "message-content";

    content.textContent =
      "AI Cẩm Trung đang tra cứu...";

    bubble.appendChild(
      content
    );

    wrapper.appendChild(
      avatar
    );

    wrapper.appendChild(
      bubble
    );

    container.appendChild(
      wrapper
    );

    container.scrollTop =
      container.scrollHeight;
  }

  if (
    !on &&
    old
  ) {

    old.remove();
  }
}


/* =========================================================
   CẬP NHẬT CÂU HỎI GỢI Ý
   ========================================================= */

function updateSuggestions(
  category
) {

  const box =
    document.querySelector(
      "#suggestions"
    );

  if (!box) {
    return;
  }

  const list =
    CATEGORY_SUGGESTIONS[
      category
    ] || [

      "Tôi muốn đăng ký khai sinh cho con thì cần làm gì?",

      "Tôi muốn thực hiện thủ tục hành chính trực tuyến thì làm thế nào?",

      "Tôi muốn gửi phản ánh, kiến nghị đến địa phương thì làm thế nào?",

      "Tôi muốn sử dụng ứng dụng i-Hà Tĩnh thì làm thế nào?"
    ];

  box.replaceChildren();

  list
    .slice(0, 4)
    .forEach(
      question => {

        const btn =
          document.createElement(
            "button"
          );

        btn.type =
          "button";

        btn.className =
          "suggestion";

        btn.textContent =
          question;

        btn.addEventListener(
          "click",
          () =>
            sendQuestion(
              question
            )
        );

        box.appendChild(
          btn
        );
      }
    );
}


/* =========================================================
   GỬI CÂU HỎI
   ========================================================= */

async function sendQuestion(
  rawQuestion
) {

  const input =
    findInput();

  const question =
    typeof rawQuestion ===
      "string"

      ? rawQuestion.trim()

      : (
          input?.value ||
          ""
        ).trim();

  if (!question) {
    return;
  }

  if (input) {
    input.value = "";
  }

  /*
     Hiển thị câu hỏi người dùng
  */

  appendMessage(
    question,
    "user"
  );

  setLoading(true);

  try {

    const category =
      detectCategory(
        question
      );

    updateSuggestions(
      category
    );

    /*
       =================================================
       BƯỚC 1 — FAQ

       Giữ nguyên cơ chế FAQ-first
       của phiên bản trước.
       =================================================
    */

    const matched =
      findBestFAQ(
        question
      );

    if (matched) {

      const answer =
        faqAnswer(
          matched
        );

      if (answer) {

        appendMessage(
          answer,
          "bot",
          faqFollowups(
            matched
          )
        );

        return;
      }
    }

    /*
       =================================================
       BƯỚC 2 — WORKER V2.2

       Worker sẽ:
       - tìm TTHC
       - Administrative Guard
       - hoặc gọi Workers AI
       =================================================
    */

    const result =
      await callAI(
        question,
        {
          category,
          intent:
            "tra_cuu"
        }
      );

    /*
       V2.3:
       truyền result.procedure
       vào appendMessage().
    */

    appendMessage(

      result.answer,

      "bot",

      result.followups.length

        ? result.followups

        : (
            CATEGORY_SUGGESTIONS[
              category
            ] ||
            []
          ).slice(0, 3),

      result.procedure
    );

  } catch (error) {

    console.error(
      "AI Cẩm Trung:",
      error
    );

    appendMessage(

      "Xin lỗi, hiện tôi chưa kết nối được với hệ thống AI. Anh/chị vui lòng thử lại sau. Nếu cần hỗ trợ về hồ sơ cụ thể, vui lòng liên hệ cơ quan có thẩm quyền.",

      "bot"
    );

  } finally {

    setLoading(false);
  }
}


/* =========================================================
   KHỞI TẠO WEBSITE
   ========================================================= */

function init() {

  /*
     Tải FAQ
  */

  loadFAQ();

  const form =
    document.querySelector(
      "#chat-form"
    );

  const input =
    findInput();

  /*
     Gửi bằng nút Gửi
  */

  if (form) {

    form.addEventListener(
      "submit",
      e => {

        e.preventDefault();

        sendQuestion();
      }
    );
  }

  /*
     Enter để gửi
     Shift + Enter xuống dòng
  */

  if (input) {

    input.addEventListener(
      "keydown",
      e => {

        if (
          e.key === "Enter" &&
          !e.shiftKey
        ) {

          e.preventDefault();

          sendQuestion();
        }
      }
    );
  }

  /*
     Gợi ý câu hỏi có sẵn
     trong index.html
  */

  document
    .querySelectorAll(
      ".suggestion"
    )
    .forEach(
      btn => {

        btn.addEventListener(
          "click",
          () =>
            sendQuestion(
              btn.dataset.question ||
              btn.textContent
            )
        );
      }
    );

  /*
     Các nút lĩnh vực
  */

  document
    .querySelectorAll(
      ".category"
    )
    .forEach(
      btn => {

        btn.addEventListener(
          "click",
          () => {

            document
              .querySelectorAll(
                ".category"
              )
              .forEach(
                x =>
                  x.classList.remove(
                    "active"
                  )
              );

            btn.classList.add(
              "active"
            );

            const category =
              btn.dataset.category;

            if (
              category ===
              "Tất cả"
            ) {

              updateSuggestions(
                "Chung"
              );

            } else {

              updateSuggestions(
                category
              );

              const note =
                document.querySelector(
                  "#category-note"
                );

              if (note) {

                note.hidden =
                  false;

                note.textContent =
                  `Đang hỗ trợ lĩnh vực: ${category}`;
              }
            }
          }
        );
      }
    );

  console.log(
    "AI Cẩm Trung V2.3 frontend đã khởi tạo."
  );

  console.log(
    "Cloudflare Worker:",
    AI_CONFIG.endpoint
  );
}


/* =========================================================
   PUBLIC API
   ========================================================= */

window.sendQuestion =
  sendQuestion;

window.AICamTrung = {

  config:
    AI_CONFIG,

  callAI,

  loadFAQ,

  sendQuestion
};


/* =========================================================
   CHẠY ỨNG DỤNG
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    init
  );

} else {

  init();
}
