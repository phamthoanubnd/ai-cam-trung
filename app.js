const CATEGORY_META = {
  "Thông tin chung": {icon:"🏛️", desc:"Thông tin cơ bản về UBND xã và Chatbot", suggestions:["UBND xã Cẩm Trung làm việc vào thời gian nào?","Tôi muốn liên hệ UBND xã Cẩm Trung bằng cách nào?","Bộ phận Một cửa của xã làm những việc gì?"]},
  "Dịch vụ công": {icon:"📄", desc:"Hướng dẫn nộp và tra cứu hồ sơ trực tuyến", suggestions:["Tôi muốn nộp hồ sơ trực tuyến thì làm thế nào?","Tôi có thể theo dõi tình trạng hồ sơ trực tuyến không?","Nếu hồ sơ bị yêu cầu bổ sung thì tôi phải làm gì?"]},
  "Hộ tịch": {icon:"👨‍👩‍👧", desc:"Khai sinh, khai tử, kết hôn và thủ tục hộ tịch", suggestions:["Đăng ký khai sinh cần những giấy tờ gì?","Tôi muốn đăng ký kết hôn cần chuẩn bị gì?","Tôi cần xác nhận tình trạng hôn nhân thì làm thế nào?"]},
  "Chứng thực": {icon:"📝", desc:"Chứng thực bản sao, chữ ký và giao dịch", suggestions:["Tôi muốn chứng thực bản sao từ bản chính thì làm thế nào?","Chứng thực chữ ký cần giấy tờ gì?","Tôi có thể chứng thực hợp đồng, giao dịch tại xã không?"]},
  "Đất đai": {icon:"🏠", desc:"Thông tin và hướng dẫn thủ tục đất đai", suggestions:["Tôi muốn cấp giấy chứng nhận quyền sử dụng đất lần đầu thì làm thế nào?","Tôi muốn tách thửa đất thì cần điều kiện gì?","Tôi muốn biết thửa đất của mình có nằm trong quy hoạch không?"]},
  "Xây dựng": {icon:"🏗️", desc:"Giấy phép xây dựng và phản ánh công trình", suggestions:["Tôi muốn xây nhà có cần xin phép xây dựng không?","Tôi muốn sửa chữa nhà thì có cần xin phép không?","Tôi muốn phản ánh công trình xây dựng có dấu hiệu vi phạm thì làm thế nào?"]},
  "Giáo dục": {icon:"🎓", desc:"Trường học, tuyển sinh và chính sách giáo dục", suggestions:["Trên địa bàn xã Cẩm Trung có những trường học nào?","Tôi muốn biết thông tin tuyển sinh của các trường trên địa bàn xã.","Tôi muốn hỏi về thủ tục chuyển trường cho học sinh."]},
  "Y tế": {icon:"🏥", desc:"Trạm y tế, khám chữa bệnh và bảo hiểm", suggestions:["Tôi muốn hỏi về trạm y tế xã Cẩm Trung.","Tôi muốn đăng ký khám tại trạm y tế xã thì làm thế nào?","Tôi muốn hỏi về bảo hiểm y tế."]},
  "An sinh xã hội": {icon:"🤝", desc:"Chính sách hỗ trợ và an sinh xã hội", suggestions:["Tôi muốn biết hộ nghèo, hộ cận nghèo được hưởng chính sách gì?","Tôi muốn hỏi về trợ cấp xã hội hàng tháng.","Tôi muốn hỏi về chính sách đối với người có công."]},
  "Doanh nghiệp": {icon:"🏢", desc:"Hộ kinh doanh, doanh nghiệp và hỗ trợ sản xuất", suggestions:["Hộ kinh doanh cần làm thủ tục gì?","Tôi muốn đăng ký hộ kinh doanh mới thì bắt đầu từ đâu?","Tôi muốn biết thông tin về các chương trình hỗ trợ doanh nghiệp."]},
  "Chuyển đổi số": {icon:"💻", desc:"i-Hà Tĩnh, kỹ năng số và an toàn trên mạng", suggestions:["Tôi muốn sử dụng ứng dụng i-Hà Tĩnh thì bắt đầu từ đâu?","Bình dân học vụ số là gì?","Tôi nghi ngờ bị lừa đảo trên mạng thì phải làm gì?"]},
  "Phản ánh kiến nghị": {icon:"📣", desc:"Gửi phản ánh, góp ý và kiến nghị với chính quyền", suggestions:["Tôi muốn phản ánh đường giao thông bị hư hỏng thì làm thế nào?","Tôi muốn phản ánh rác thải gây ô nhiễm thì làm thế nào?","Tôi muốn kiến nghị một vấn đề với UBND xã thì làm thế nào?"]},
  "Dữ liệu địa phương": {icon:"🗺️", desc:"Địa điểm, trường học, cơ sở và bản đồ số", suggestions:["Tôi muốn tìm thông tin các thôn trên địa bàn xã Cẩm Trung.","Tôi muốn biết các điểm trường trên địa bàn xã.","AI Cẩm Trung có bản đồ số không?"]},
  "Quản trị Chatbot": {icon:"⚙️", desc:"Dữ liệu, phản hồi và vận hành Chatbot", suggestions:["Ai chịu trách nhiệm cập nhật dữ liệu cho Chatbot Cẩm Trung?","Chatbot cập nhật thông tin mới như thế nào?","Nếu câu trả lời của Chatbot sai thì tôi phải làm gì?"]}
};

// Menu hiển thị 10 nhóm chính; một số nhóm dữ liệu FAQ vẫn được giữ để tìm kiếm.
const MAIN_CATEGORIES = ["Thông tin chung","Dịch vụ công","Hộ tịch","Đất đai","Xây dựng","Giáo dục","Y tế","An sinh xã hội","Doanh nghiệp","Chuyển đổi số"];
let faqData = [];
let currentCategory = "Thông tin chung";

const menu = document.getElementById("categoryMenu");
const suggestions = document.getElementById("suggestions");
const messages = document.getElementById("chatMessages");
const input = document.getElementById("questionInput");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearBtn");
const currentTitle = document.getElementById("currentTitle");
const currentDesc = document.getElementById("currentDesc");

function renderMenu(){
  menu.innerHTML = MAIN_CATEGORIES.map(cat => {
    const meta = CATEGORY_META[cat] || {icon:"📌"};
    return `<button class="category-btn ${cat===currentCategory?"active":""}" data-category="${cat}">
      <span class="category-icon">${meta.icon}</span><span>${cat}</span>
    </button>`;
  }).join("");
  menu.querySelectorAll(".category-btn").forEach(btn => btn.addEventListener("click",()=>selectCategory(btn.dataset.category)));
}

function selectCategory(category){
  currentCategory = category;
  const meta = CATEGORY_META[category] || {};
  currentTitle.textContent = category;
  currentDesc.textContent = meta.desc || "Các câu hỏi gợi ý";
  renderMenu();
  renderSuggestions();
}

function renderSuggestions(){
  const list = (CATEGORY_META[currentCategory]?.suggestions || []).slice(0,3);
  suggestions.innerHTML = list.map(q=>`<button class="suggestion">${q}</button>`).join("");
  suggestions.querySelectorAll(".suggestion").forEach(btn=>btn.addEventListener("click",()=>ask(btn.textContent)));
}

function addMessage(text, type){
  const div = document.createElement("div");
  div.className = `message ${type}`;
  div.innerHTML = `<div class="avatar">${type==="bot"?"AI":"Bạn"}</div><div class="bubble"><strong>${type==="bot"?"AI Cẩm Trung":"Bạn"}</strong><p></p></div>`;
  div.querySelector("p").textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function normalize(s){
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d");
}

function findAnswer(question){
  const q = normalize(question);
  let best = null, bestScore = 0;
  faqData.forEach(item=>{
    const corpus = normalize(`${item.question} ${(item.keywords||[]).join(" ")} ${item.category||""}`);
    let score = 0;
    const words = q.split(/\s+/).filter(w=>w.length>=3);
    words.forEach(w=>{ if(corpus.includes(w)) score += 1; });
    if(normalize(item.category||"")===normalize(currentCategory)) score += 2;
    if(score>bestScore){bestScore=score;best=item;}
  });
  return bestScore >= 2 ? best.answer : "Tôi chưa tìm thấy câu trả lời đủ chính xác trong kho dữ liệu hiện tại. Anh/chị có thể diễn đạt cụ thể hơn hoặc liên hệ Bộ phận Một cửa/cán bộ chuyên môn để được hỗ trợ.";
}

function ask(text){
  const q = text.trim();
  if(!q) return;
  addMessage(q,"user");
  input.value="";
  setTimeout(()=>addMessage(findAnswer(q),"bot"),180);
}

sendBtn.addEventListener("click",()=>ask(input.value));
input.addEventListener("keydown",e=>{
  if(e.key==="Enter" && !e.shiftKey){e.preventDefault();ask(input.value);}
});
input.addEventListener("input",()=>{input.style.height="auto";input.style.height=Math.min(input.scrollHeight,130)+"px";});
clearBtn.addEventListener("click",()=>{
  messages.innerHTML = `<div class="message bot"><div class="avatar">AI</div><div class="bubble"><strong>AI Cẩm Trung</strong><p>Đã làm mới cuộc trò chuyện. Anh/chị hãy chọn lĩnh vực hoặc đặt câu hỏi.</p></div></div>`;
});

async function loadFAQ(){
  try{
    const response = await fetch("data/faq.json");
    if(!response.ok) throw new Error("Không tải được FAQ");
    faqData = await response.json();
  }catch(err){
    console.error(err);
    addMessage("Không tải được kho FAQ. Vui lòng kiểm tra file data/faq.json.","bot");
  }
  renderMenu();
  selectCategory(currentCategory);
}
loadFAQ();
