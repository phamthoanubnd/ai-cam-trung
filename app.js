/* =========================================================
   AI CẨM TRUNG V2.0 — app.js
   GitHub Pages -> Cloudflare Worker -> Workers AI
   Không chứa API key.
   ========================================================= */

const AI_CONFIG = {
  endpoint: "https://ai-cam-trung-api.phamthoanubnd.workers.dev/api/chat",
  enabled: true,
  timeout: 30000
};

const FAQ_CONFIG = { url: "./faq.json" };

let FAQ_DATA = [];
let FAQ_READY = false;

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

function normalizeText(text = "") {
  return String(text).toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ").trim();
}

async function loadFAQ() {
  try {
    const r = await fetch(FAQ_CONFIG.url, { cache: "no-store" });
    if (!r.ok) throw new Error(`FAQ HTTP ${r.status}`);
    const data = await r.json();
    FAQ_DATA = Array.isArray(data) ? data :
      Array.isArray(data.faq) ? data.faq :
      Array.isArray(data.questions) ? data.questions : [];
    FAQ_READY = true;
    console.log(`AI Cẩm Trung: đã tải ${FAQ_DATA.length} FAQ.`);
  } catch (e) {
    console.warn("Chưa tải được faq.json. Website vẫn có thể dùng AI:", e);
    FAQ_DATA = [];
    FAQ_READY = false;
  }
}

function faqScore(question, item) {
  const q = normalizeText(question);
  const qt = normalizeText(item.question || item.q || item.title || "");
  const keys = Array.isArray(item.keywords) ? item.keywords.map(normalizeText) : [];
  if (!qt) return 0;

  let score = q === qt ? 100 : 0;
  if (q.includes(qt) || qt.includes(q)) score += 60;

  const qw = new Set(q.split(" ").filter(x => x.length >= 2));
  const tw = new Set(qt.split(" ").filter(x => x.length >= 2));

  for (const word of qw) {
    if (tw.has(word)) score += 5;
    if (keys.some(k => k.includes(word) || word.includes(k))) score += 4;
  }
  return score;
}

function findBestFAQ(question) {
  if (!FAQ_READY) return null;
  let best = null, bestScore = 0;
  for (const item of FAQ_DATA) {
    const score = faqScore(question, item);
    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }
  return best && bestScore >= 35 ? best : null;
}

function faqAnswer(item) {
  return item.answer || item.a || item.response || item.content || "";
}

function faqFollowups(item) {
  const v = item.followups || item.suggestions || item.related_questions || [];
  return Array.isArray(v) ? v.slice(0, 3) : [];
}

function detectCategory(question) {
  const q = normalizeText(question);
  const groups = [
    ["Thủ tục hành chính", ["thu tuc", "ho so", "dich vu cong", "nop ho so", "ket qua"]],
    ["Hộ tịch", ["khai sinh", "khai tu", "ket hon", "ho tich", "tinh trang hon nhan"]],
    ["Đất đai", ["dat dai", "so do", "giay chung nhan", "chuyen nhuong dat", "cap dat"]],
    ["Chính sách xã hội", ["bao tro", "nguoi co cong", "ho ngheo", "tro cap", "chinh sach"]],
    ["Giáo dục", ["truong hoc", "hoc sinh", "giao vien", "tuyen sinh", "mam non", "tieu hoc", "thcs"]],
    ["Y tế", ["tram y te", "y te", "bao hiem y te", "kham benh", "tiem chung"]],
    ["Chuyển đổi số", ["chuyen doi so", "i ha tinh", "i-hatinh", "vneid", "binh dan hoc vu so"]],
    ["Doanh nghiệp", ["doanh nghiep", "kinh doanh", "ho kinh doanh", "dang ky kinh doanh"]],
    ["Nông nghiệp", ["nong nghiep", "chan nuoi", "trong trot", "nong dan"]],
    ["Phản ánh, kiến nghị", ["phan anh", "kien nghi", "phan anh hien truong", "gop y"]]
  ];
  for (const [category, keys] of groups) {
    if (keys.some(k => q.includes(normalizeText(k)))) return category;
  }
  return "Chung";
}

async function callAI(question, extra = {}) {
  if (!AI_CONFIG.enabled) throw new Error("AI đang tắt.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_CONFIG.timeout);

  try {
    const response = await fetch(AI_CONFIG.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        category: extra.category || detectCategory(question),
        intent: extra.intent || "tra_cuu",
        context: extra.context || "",
        faq: extra.faq || ""
      }),
      signal: controller.signal
    });

    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(`Worker trả về dữ liệu không hợp lệ: ${raw.slice(0, 200)}`);
    }

    if (!response.ok || data.error) {
      throw new Error(data.error || `Worker HTTP ${response.status}`);
    }

    return {
      answer: data.answer || data.message || data.response || "Xin lỗi, tôi chưa có câu trả lời phù hợp.",
      category: data.category || extra.category || "Chung",
      followups: Array.isArray(data.followups) ? data.followups.slice(0, 3) : []
    };
  } finally {
    clearTimeout(timer);
  }
}

function findInput() {
  return document.querySelector("#user-input");
}

function findMessagesContainer() {
  return document.querySelector("#chat-messages");
}

function appendMessage(text, type = "bot", followups = []) {
  const container = findMessagesContainer();
  if (!container) return;

  const wrapper = document.createElement("div");
  wrapper.className = `message ${type}-message`;

  if (type === "bot") {
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = "AI";
    wrapper.appendChild(avatar);
  }

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  if (type === "bot") {
    const name = document.createElement("div");
    name.className = "message-name";
    name.textContent = "AI Cẩm Trung";
    bubble.appendChild(name);
  }

  const content = document.createElement("div");
  content.className = "message-content";
  content.textContent = text;
  bubble.appendChild(content);

  if (followups.length) {
    const box = document.createElement("div");
    box.className = "followup-suggestions";

    followups.forEach(q => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "followup-btn";
      btn.textContent = q;
      btn.addEventListener("click", () => sendQuestion(q));
      box.appendChild(btn);
    });

    bubble.appendChild(box);
  }

  wrapper.appendChild(bubble);
  container.appendChild(wrapper);
  container.scrollTop = container.scrollHeight;
}

function setLoading(on) {
  const button = document.querySelector("#send-btn");
  if (button) {
    button.disabled = on;
    button.querySelector("span:first-child").textContent = on ? "Đang trả lời..." : "Gửi";
  }

  const container = findMessagesContainer();
  if (!container) return;

  const old = container.querySelector(".ai-loading-message");

  if (on && !old) {
    const wrapper = document.createElement("div");
    wrapper.className = "message bot-message ai-loading-message";

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = "AI";

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    const content = document.createElement("div");
    content.className = "message-content";
    content.textContent = "AI Cẩm Trung đang tra cứu...";

    bubble.appendChild(content);
    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);
    container.appendChild(wrapper);
    container.scrollTop = container.scrollHeight;
  }

  if (!on && old) old.remove();
}

function updateSuggestions(category) {
  const box = document.querySelector("#suggestions");
  if (!box) return;

  const list = CATEGORY_SUGGESTIONS[category] || [
    "Tôi muốn đăng ký khai sinh cho con thì cần làm gì?",
    "Tôi muốn thực hiện thủ tục hành chính trực tuyến thì làm thế nào?",
    "Tôi muốn gửi phản ánh, kiến nghị đến địa phương thì làm thế nào?",
    "Tôi muốn sử dụng ứng dụng i-Hà Tĩnh thì làm thế nào?"
  ];

  box.replaceChildren();

  list.slice(0, 4).forEach(question => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "suggestion";
    btn.textContent = question;
    btn.addEventListener("click", () => sendQuestion(question));
    box.appendChild(btn);
  });
}

async function sendQuestion(rawQuestion) {
  const input = findInput();
  const question = typeof rawQuestion === "string"
    ? rawQuestion.trim()
    : (input?.value || "").trim();

  if (!question) return;
  if (input) input.value = "";

  appendMessage(question, "user");
  setLoading(true);

  try {
    const category = detectCategory(question);
    updateSuggestions(category);

    const matched = findBestFAQ(question);

    if (matched) {
      const answer = faqAnswer(matched);
      if (answer) {
        appendMessage(answer, "bot", faqFollowups(matched));
        return;
      }
    }

    const result = await callAI(question, {
      category,
      intent: "tra_cuu"
    });

    appendMessage(
      result.answer,
      "bot",
      result.followups.length ? result.followups : (CATEGORY_SUGGESTIONS[category] || []).slice(0, 3)
    );
  } catch (error) {
    console.error("AI Cẩm Trung:", error);
    appendMessage(
      "Xin lỗi, hiện tôi chưa kết nối được với hệ thống AI. Anh/chị vui lòng thử lại sau. Nếu cần hỗ trợ về hồ sơ cụ thể, vui lòng liên hệ cơ quan có thẩm quyền.",
      "bot"
    );
  } finally {
    setLoading(false);
  }
}

function init() {
  loadFAQ();

  const form = document.querySelector("#chat-form");
  const input = findInput();

  if (form) {
    form.addEventListener("submit", e => {
      e.preventDefault();
      sendQuestion();
    });
  }

  if (input) {
    input.addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendQuestion();
      }
    });
  }

  document.querySelectorAll(".suggestion").forEach(btn => {
    btn.addEventListener("click", () => sendQuestion(btn.dataset.question || btn.textContent));
  });

  document.querySelectorAll(".category").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".category").forEach(x => x.classList.remove("active"));
      btn.classList.add("active");

      const category = btn.dataset.category;
      if (category === "Tất cả") {
        updateSuggestions("Chung");
      } else {
        updateSuggestions(category);
        const note = document.querySelector("#category-note");
        if (note) {
          note.hidden = false;
          note.textContent = `Đang hỗ trợ lĩnh vực: ${category}`;
        }
      }
    });
  });

  console.log("AI Cẩm Trung V2.0 frontend đã khởi tạo.");
  console.log("Cloudflare Worker:", AI_CONFIG.endpoint);
}

window.sendQuestion = sendQuestion;
window.AICamTrung = { config: AI_CONFIG, callAI, loadFAQ, sendQuestion };

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
