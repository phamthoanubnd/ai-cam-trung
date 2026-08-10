const state = {
  faqs: [],
  loading: false
};

const chat = document.getElementById("chat");
const form = document.getElementById("chatForm");
const input = document.getElementById("questionInput");
const sendBtn = document.getElementById("sendBtn");

function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function scoreFaq(query, faq) {
  const q = normalize(query);
  const haystack = normalize(
    [faq.question, faq.answer, ...(faq.keywords || [])].join(" ")
  );

  let score = 0;
  const words = q.split(/\s+/).filter(w => w.length > 2);

  for (const word of words) {
    if (haystack.includes(word)) score += 1;
  }

  for (const keyword of faq.keywords || []) {
    if (q.includes(normalize(keyword))) score += 4;
  }

  return score;
}

function findFaq(query) {
  let best = null;
  let bestScore = 0;

  for (const faq of state.faqs) {
    const score = scoreFaq(query, faq);
    if (score > bestScore) {
      bestScore = score;
      best = faq;
    }
  }

  return bestScore >= 2 ? best : null;
}

function addMessage(text, role = "bot") {
  const row = document.createElement("div");
  row.className = `message ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "bot" ? "AI" : "Bạn";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  row.appendChild(avatar);
  row.appendChild(bubble);
  chat.appendChild(row);
  chat.scrollTop = chat.scrollHeight;
}

function answerQuestion(question) {
  const faq = findFaq(question);

  if (faq) {
    return `${faq.answer}\n\nNguồn dữ liệu: Kho FAQ AI Cẩm Trung V1.0 (${faq.id}).`;
  }

  return "Tôi chưa tìm thấy thông tin phù hợp trong kho dữ liệu thử nghiệm AI Cẩm Trung V1.0. Anh/chị vui lòng thử diễn đạt câu hỏi cụ thể hơn hoặc liên hệ Bộ phận Một cửa/cán bộ chuyên môn để được hỗ trợ.\n\nLưu ý: phiên bản này chưa kết nối mô hình AI trực tuyến.";
}

async function loadFaq() {
  try {
    const response = await fetch("data/faq.json");
    if (!response.ok) throw new Error("Không tải được FAQ");
    state.faqs = await response.json();
  } catch (error) {
    console.error(error);
    addMessage("Không tải được kho FAQ. Chị hãy kiểm tra cấu trúc thư mục data/faq.json.", "bot");
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const question = input.value.trim();
  if (!question || state.loading) return;

  state.loading = true;
  sendBtn.disabled = true;
  addMessage(question, "user");

  setTimeout(() => {
    addMessage(answerQuestion(question), "bot");
    input.value = "";
    input.focus();
    state.loading = false;
    sendBtn.disabled = false;
  }, 350);
});

document.querySelectorAll(".suggestions button").forEach(button => {
  button.addEventListener("click", () => {
    input.value = button.dataset.question;
    input.focus();
  });
});

loadFaq();
