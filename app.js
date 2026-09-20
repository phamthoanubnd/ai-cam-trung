/* =========================================================
   AI CẨM TRUNG V2.3.1 — app.js
   GitHub Pages -> Cloudflare Worker V2.2 -> Workers AI

   LUỒNG XỬ LÝ:
   1. Nhận diện câu hỏi có khả năng là TTHC
   2. Nếu là TTHC -> Worker V2.2 xử lý trước
   3. Nếu không phải TTHC -> FAQ
   4. Nếu FAQ không có -> Worker -> Workers AI

   TÍNH NĂNG:
   - TTHC ưu tiên trước FAQ
   - Nhận procedure từ Worker
   - Hiển thị nút Cổng DVC Quốc gia
   - Ẩn URL dài trong nội dung chat
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
    "Tôi muốn đăng ký kết hôn.",
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
   NHẬN DIỆN CÂU HỎI TTHC

   Mục đích:
   Nếu câu hỏi có khả năng liên quan TTHC,
   gửi thẳng sang Worker V2.2 trước FAQ.

   Worker mới là nơi quyết định:
   - TTHC đã xác minh
   - TTHC chưa có dữ liệu
   - Administrative Guard
   ========================================================= */

function isLikelyAdministrativeQuestion(question) {

  const q = normalizeText(question);

  const administrativeKeywords = [

    /* Chung */

    "thu tuc",
    "thu tuc hanh chinh",
    "ho so",
    "nop ho so",
    "nop truc tuyen",
    "dich vu cong",
    "cap lai",
    "xin cap",
    "dang ky",
    "giay to",
    "le phi",
    "phi bao nhieu",
    "thoi han",
    "bao lau",
    "tra cuu ho so",

    /* Hộ tịch */

    "khai sinh",
    "giay khai sinh",
    "khai tu",
    "giay khai tu",
    "ket hon",
    "dang ky ket hon",
    "giay ket hon",
    "ho tich",
    "tinh trang hon nhan",
    "giay doc than",
    "xac nhan doc than",
    "cai chinh ho tich",
    "dang ky lai khai sinh",

    /* Chứng thực */

    "chung thuc",
    "chung thuc ban sao",
    "chung thuc chu ky",
    "sao y",

    /* Hộ kinh doanh */

    "ho kinh doanh",
    "dang ky kinh doanh",
    "thanh lap ho kinh doanh",
    "tam ngung kinh doanh",
    "cham dut ho kinh doanh",

    /* Chính sách */

    "tro cap",
    "bao tro xa hoi",
    "mai tang phi",
    "nguoi co cong"
  ];

  return administrativeKeywords.some(
    keyword => q.includes(keyword)
  );
}


/* =========================================================
   TẢI FAQ
   ========================================================= */

async function loadFAQ() {

  try {

    const response = await fetch(
      FAQ_CONFIG.url,
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {

      throw new Error(
        `FAQ HTTP ${response.status}`
      );
    }

    const data = await response.json();

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

  } catch (error) {

    console.warn(
      "Chưa tải được faq.json. Website vẫn có thể dùng AI:",
      error
    );

    FAQ_DATA = [];
    FAQ_READY = false;
  }
}


/* =========================================================
   TÍNH ĐIỂM FAQ
   ========================================================= */

function faqScore(question, item) {

  const q = normalizeText(question);

  const qt = normalizeText(
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

  const questionWords = new Set(
    q
      .split(" ")
      .filter(
        word => word.length >= 2
      )
  );

  const targetWords = new Set(
    qt
      .split(" ")
      .filter(
        word => word.length >= 2
      )
  );

  for (const word of questionWords) {

    if (targetWords.has(word)) {
      score += 5;
    }

    if (
      keys.some(
        key =>
          key.includes(word) ||
          word.includes(key)
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

    const score = faqScore(
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

  const suggestions =
    item.followups ||
    item.suggestions ||
    item.related_questions ||
    [];

  return Array.isArray(suggestions)
    ? suggestions.slice(0, 3)
    : [];
}


/* =========================================================
   NHẬN DIỆN LĨNH VỰC
   ========================================================= */

function detectCategory(question) {

  const q = normalizeText(question);

  const groups = [

    [
      "Hộ tịch",
      [
        "khai sinh",
        "khai tu",
        "ket hon",
        "ho tich",
        "tinh trang hon nhan",
        "giay doc than"
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
    ],

    [
      "Thủ tục hành chính",
      [
        "thu tuc",
        "ho so",
        "dich vu cong",
        "nop ho so",
        "ket qua"
      ]
    ]
  ];

  for (
    const [category, keywords]
    of groups
  ) {

    if (
      keywords.some(
        keyword =>
          q.includes(
            normalizeText(keyword)
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

          body: JSON.stringify({

            question,

            category:
              extra.category ||
              detectCategory(question),

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
        null,

      version:
        data.version ||
        ""
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
   LÀM SẠCH CÂU TRẢ LỜI TTHC

   Worker V2.2 có thể đang trả URL trong answer.
   Frontend V2.3.1 sẽ loại URL đó và thay bằng nút.
   ========================================================= */

function cleanProcedureAnswer(
  text,
  procedure
) {

  if (
    !procedure ||
    !procedure.url
  ) {

    return String(
      text || ""
    );
  }

  const url =
    String(
      procedure.url
    ).trim();

  let result =
    String(
      text || ""
    );

  result =
    result
      .split("\n")
      .filter(
        line => {

          const trimmed =
            line.trim();

          /*
             Xóa:
             Xem thủ tục: https://...
          */

          if (
            trimmed
              .toLowerCase()
              .startsWith(
                "xem thủ tục:"
              )
          ) {

            return false;
          }

          /*
             Xóa dòng chỉ chứa URL.
          */

          if (
            trimmed === url
          ) {

            return false;
          }

          return true;
        }
      )
      .join("\n");

  /*
     Nếu URL vẫn xuất hiện
     trong nội dung thì xóa.
  */

  if (url) {

    result =
      result
        .split(url)
        .join("");
  }

  /*
     Thu gọn dòng trống.
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

   Chỉ cho phép nút trỏ đến:
   dichvucong.gov.vn
   hoặc tên miền con của nó.
   ========================================================= */

function isOfficialDvcUrl(url) {

  if (!url) {
    return false;
  }

  try {

    const parsed =
      new URL(url);

    const hostname =
      parsed.hostname
        .toLowerCase();

    return (
      parsed.protocol === "https:" &&
      (
        hostname ===
          "dichvucong.gov.vn" ||

        hostname.endsWith(
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
     STYLE DỰ PHÒNG

     Không cần sửa style.css
     ngay ở phiên bản này.
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

  link.style.textAlign =
    "center";


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


  /* -------------------------
     Avatar AI
     ------------------------- */

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


  /* -------------------------
     Bong bóng chat
     ------------------------- */

  const bubble =
    document.createElement(
      "div"
    );

  bubble.className =
    "bubble";


  /* -------------------------
     Tên AI
     ------------------------- */

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


  /* -------------------------
     Nội dung
     ------------------------- */

  const content =
    document.createElement(
      "div"
    );

  content.className =
    "message-content";


  let displayText =
    String(
      text || ""
    );


  /*
     Nếu có procedure:
     xóa URL dài khỏi nội dung.
  */

  if (
    type === "bot" &&
    procedure
  ) {

    displayText =
      cleanProcedureAnswer(
        displayText,
        procedure
      );
  }


  /*
     Dùng textContent
     để tránh chèn HTML không an toàn.
  */

  content.textContent =
    displayText;

  bubble.appendChild(
    content
  );


  /* -------------------------
     Nút Cổng DVC
     ------------------------- */

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


  /* -------------------------
     Câu hỏi gợi ý
     ------------------------- */

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


    followups.forEach(
      question => {

        const btn =
          document.createElement(
            "button"
          );

        btn.type =
          "button";

        btn.className =
          "followup-btn";

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
   HIỂN THỊ KẾT QUẢ WORKER

   Dùng chung cho:
   - TTHC
   - Administrative Guard
   - AI
   ========================================================= */

function showWorkerResult(
  result,
  category
) {

  const followups =
    result.followups.length

      ? result.followups

      : (
          CATEGORY_SUGGESTIONS[
            category
          ] ||
          []
        ).slice(0, 3);


  appendMessage(
    result.answer,
    "bot",
    followups,
    result.procedure
  );
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
   CẬP NHẬT GỢI Ý CÂU HỎI
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

   ĐÂY LÀ THAY ĐỔI QUAN TRỌNG CỦA V2.3.1
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

    input.value =
      "";
  }


  /*
     Hiển thị câu hỏi người dân
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


    /* =====================================================
       BƯỚC 1

       KIỂM TRA CÓ KHẢ NĂNG LÀ TTHC KHÔNG?

       Nếu CÓ:
       bỏ qua FAQ và chuyển thẳng Worker V2.2.
       ===================================================== */

    if (
      isLikelyAdministrativeQuestion(
        question
      )
    ) {

      console.log(
        "AI Cẩm Trung: ưu tiên kiểm tra TTHC."
      );


      const result =
        await callAI(
          question,
          {
            category,
            intent:
              "tthc_lookup"
          }
        );


      showWorkerResult(
        result,
        category
      );


      return;
    }


    /* =====================================================
       BƯỚC 2

       KHÔNG CÓ DẤU HIỆU TTHC
       -> KIỂM TRA FAQ
       ===================================================== */

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

        console.log(
          "AI Cẩm Trung: trả lời từ FAQ."
        );


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


    /* =====================================================
       BƯỚC 3

       FAQ KHÔNG CÓ
       -> GỌI WORKER / WORKERS AI
       ===================================================== */

    console.log(
      "AI Cẩm Trung: chuyển câu hỏi sang Worker."
    );


    const result =
      await callAI(
        question,
        {
          category,
          intent:
            "tra_cuu"
        }
      );


    showWorkerResult(
      result,
      category
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


  /* -------------------------
     Nút Gửi
     ------------------------- */

  if (form) {

    form.addEventListener(
      "submit",
      event => {

        event.preventDefault();

        sendQuestion();
      }
    );
  }


  /* -------------------------
     Enter để gửi
     Shift + Enter xuống dòng
     ------------------------- */

  if (input) {

    input.addEventListener(
      "keydown",
      event => {

        if (
          event.key ===
            "Enter" &&
          !event.shiftKey
        ) {

          event.preventDefault();

          sendQuestion();
        }
      }
    );
  }


  /* -------------------------
     Câu hỏi gợi ý
     trong index.html
     ------------------------- */

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


  /* -------------------------
     Các lĩnh vực
     ------------------------- */

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
                item =>
                  item.classList.remove(
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
    "AI Cẩm Trung V2.3.1 frontend đã khởi tạo."
  );


  console.log(
    "Luồng xử lý: TTHC -> Worker | Không phải TTHC -> FAQ -> Worker."
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

  sendQuestion,

  detectCategory,

  isLikelyAdministrativeQuestion
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
