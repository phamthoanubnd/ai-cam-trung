/* AI CẨM TRUNG V2.0 — app.js
   GitHub Pages -> Cloudflare Worker -> Workers AI
*/

const AI_CONFIG = {
  endpoint: "https://ai-cam-trung-api.phamthoanubnd.workers.dev/api/chat",
  enabled: true,
  timeout: 30000
};

const FAQ_CONFIG = { url: "./faq.json" };
let FAQ_DATA = [];
let FAQ_READY = false;

function normalizeText(text = "") {
  return String(text).toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ").trim();
}

function loadFAQ() {
  return fetch(FAQ_CONFIG.url, { cache: "no-store" })
    .then(r => { if (!r.ok) throw new Error(`FAQ HTTP ${r.status}`); return r.json(); })
    .then(data => {
      FAQ_DATA = Array.isArray(data) ? data :
        Array.isArray(data.faq) ? data.faq :
        Array.isArray(data.questions) ? data.questions : [];
      FAQ_READY = true;
      console.log(`AI Cẩm Trung: đã tải ${FAQ_DATA.length} FAQ.`);
      return FAQ_DATA;
    })
    .catch(err => {
      console.warn("Không tải được faq.json:", err);
      FAQ_DATA = []; FAQ_READY = false; return [];
    });
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
  for (const w of qw) {
    if (tw.has(w)) score += 5;
    if (keys.some(k => k.includes(w) || w.includes(k))) score += 4;
  }
  return score;
}

function findBestFAQ(question) {
  if (!FAQ_READY) return null;
  let best = null, bestScore = 0;
  for (const item of FAQ_DATA) {
    const score = faqScore(question, item);
    if (score > bestScore) { best = item; bestScore = score; }
  }
  return best && bestScore >= 35 ? { item: best, score: bestScore } : null;
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
    ["thủ tục hành chính", ["thu tuc","ho so","dich vu cong","nop ho so","ket qua"]],
    ["hộ tịch", ["khai sinh","khai tu","ket hon","ho tich","tinh trang hon nhan"]],
    ["đất đai", ["dat dai","so do","giay chung nhan","chuyen nhuong dat","cap dat"]],
    ["chính sách xã hội", ["bao tro","nguoi co cong","ho ngheo","tro cap","chinh sach"]],
    ["giáo dục", ["truong hoc","hoc sinh","giao vien","tuyen sinh","mam non","tieu hoc","thcs"]],
    ["y tế", ["tram y te","y te","bao hiem y te","kham benh","tiem chung"]],
    ["chuyển đổi số", ["chuyen doi so","i-ha tinh","vneid","binh dan hoc vu so","cong nghe"]],
    ["doanh nghiệp", ["doanh nghiep","kinh doanh","ho kinh doanh","dang ky kinh doanh"]],
    ["nông nghiệp", ["nong nghiep","chan nuoi","trong trot","nong dan","vat nuoi"]],
    ["phản ánh, kiến nghị", ["phan anh","kien nghi","phan anh hien truong","gop y"]]
  ];
  for (const [cat, keys] of groups) if (keys.some(k => q.includes(k))) return cat;
  return "chung";
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
    try { data = JSON.parse(raw); }
    catch { throw new Error(`Worker trả về dữ liệu không hợp lệ: ${raw.slice(0, 300)}`); }
    if (!response.ok || data.error) throw new Error(data.error || `Worker HTTP ${response.status}`);
    return {
      answer: data.answer || data.message || data.response || "Xin lỗi, tôi chưa có câu trả lời phù hợp.",
      category: data.category || "",
      intent: data.intent || "",
      followups: Array.isArray(data.followups) ? data.followups.slice(0, 3) : []
    };
  } finally { clearTimeout(timer); }
}

function findInput() {
  return document.querySelector("#user-input, #userInput, #question, textarea[name='question'], textarea, input[type='text']");
}

function findSendButton() {
  return document.querySelector("#send-btn, #sendButton, #send-button, [data-action='send'], button[type='submit']");
}

function findMessagesContainer() {
  return document.querySelector("#chat-messages, #messages, #chatMessages, .chat-messages, .messages, .chat-box");
}

function appendMessage(text, type = "bot", followups = []) {
  const container = findMessagesContainer();
  if (!container) { console.log(type === "user" ? "Bạn:" : "AI Cẩm Trung:", text); return; }

  const wrapper = document.createElement("div");
  wrapper.className = `message ${type}-message ai-message`;
  const content = document.createElement("div");
  content.className = "message-content";
  content.textContent = text;
  wrapper.appendChild(content);

  if (followups.length) {
    const box = document.createElement("div");
    box.className = "followup-suggestions";
    followups.forEach(q => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "followup-btn"; b.textContent = q;
      b.addEventListener("click", () => {
        const input = findInput();
        if (input) { input.value = q; input.focus(); }
        sendQuestion(q);
      });
      box.appendChild(b);
    });
    wrapper.appendChild(box);
  }
  container.appendChild(wrapper);
  container.scrollTop = container.scrollHeight;
}

function setLoading(on) {
  const button = findSendButton();
  if (button) {
    button.disabled = on;
    if (!button.dataset.originalText) button.dataset.originalText = button.textContent;
    button.textContent = on ? "Đang trả lời..." : button.dataset.originalText;
  }
  const container = findMessagesContainer();
  if (!container) return;
  const old = container.querySelector(".ai-loading-message");
  if (on && !old) {
    const el = document.createElement("div");
    el.className = "message bot-message ai-loading-message";
    el.textContent = "AI Cẩm Trung đang tra cứu...";
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
  } else if (!on && old) old.remove();
}

async function sendQuestion(rawQuestion) {
  const input = findInput();
  const question = typeof rawQuestion === "string" ? rawQuestion.trim() : (input?.value || "").trim();
  if (!question) return;
  if (input) input.value = "";

  appendMessage(question, "user");
  setLoading(true);

  try {
    const matched = findBestFAQ(question);
    if (matched) {
      const answer = faqAnswer(matched.item);
      if (answer) {
        appendMessage(answer, "bot", faqFollowups(matched.item));
        return;
      }
    }

    const result = await callAI(question, {
      category: detectCategory(question),
      intent: "tra_cuu"
    });
    appendMessage(result.answer, "bot", result.followups);
  } catch (err) {
    console.error("AI Cẩm Trung error:", err);
    appendMessage(
      "Xin lỗi, hệ thống AI Cẩm Trung hiện chưa kết nối được. Anh/chị vui lòng thử lại sau hoặc liên hệ UBND xã Cẩm Trung để được hỗ trợ.",
      "bot"
    );
  } finally {
    setLoading(false);
  }
}

function initChatbot() {
  loadFAQ();

  const input = findInput();
  const button = findSendButton();

  if (button) button.addEventListener("click", e => { e.preventDefault(); sendQuestion(); });
  if (input) input.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendQuestion(); }
  });

  document.querySelectorAll("[data-question]").forEach(el => {
    el.addEventListener("click", () => {
      const q = el.getAttribute("data-question");
      if (q) sendQuestion(q);
    });
  });

  console.log("AI Cẩm Trung V2.0 đã khởi tạo.");
  console.log("Worker:", AI_CONFIG.endpoint);
}

window.sendQuestion = sendQuestion;
window.askAI = sendQuestion;
window.AICamTrung = { config: AI_CONFIG, loadFAQ, callAI, sendQuestion, findBestFAQ };

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initChatbot);
else initChatbot();
