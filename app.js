// AI CẨM TRUNG V1.2 - Natural FAQ Engine
const CATEGORY_META={
"Thông tin chung":{icon:"🏛️",desc:"Thông tin cơ bản về UBND xã và Chatbot",suggestions:["UBND xã Cẩm Trung làm việc vào thời gian nào?","Tôi muốn liên hệ UBND xã Cẩm Trung bằng cách nào?","Bộ phận Một cửa của xã làm những việc gì?"]},
"Dịch vụ công":{icon:"📄",desc:"Hướng dẫn nộp và tra cứu hồ sơ trực tuyến",suggestions:["Tôi muốn nộp hồ sơ trực tuyến thì làm thế nào?","Tôi có thể theo dõi tình trạng hồ sơ trực tuyến không?","Nếu hồ sơ bị yêu cầu bổ sung thì tôi phải làm gì?"]},
"Hộ tịch":{icon:"👨‍👩‍👧",desc:"Khai sinh, khai tử, kết hôn và thủ tục hộ tịch",suggestions:["Đăng ký khai sinh cần những giấy tờ gì?","Tôi muốn đăng ký kết hôn cần chuẩn bị gì?","Tôi cần xác nhận tình trạng hôn nhân thì làm thế nào?"]},
"Đất đai":{icon:"🏠",desc:"Thông tin và hướng dẫn thủ tục đất đai",suggestions:["Tôi muốn cấp giấy chứng nhận quyền sử dụng đất lần đầu thì làm thế nào?","Tôi muốn tách thửa đất thì cần điều kiện gì?","Tôi muốn biết thửa đất của mình có nằm trong quy hoạch không?"]},
"Xây dựng":{icon:"🏗️",desc:"Giấy phép xây dựng và phản ánh công trình",suggestions:["Tôi muốn xây nhà có cần xin phép xây dựng không?","Tôi muốn sửa chữa nhà thì có cần xin phép không?","Tôi muốn phản ánh công trình xây dựng có dấu hiệu vi phạm thì làm thế nào?"]},
"Giáo dục":{icon:"🎓",desc:"Trường học, tuyển sinh và chính sách giáo dục",suggestions:["Trên địa bàn xã Cẩm Trung có những trường học nào?","Tôi muốn biết thông tin tuyển sinh của các trường trên địa bàn xã.","Tôi muốn hỏi về thủ tục chuyển trường cho học sinh."]},
"Y tế":{icon:"🏥",desc:"Trạm y tế, khám chữa bệnh và bảo hiểm",suggestions:["Tôi muốn hỏi về trạm y tế xã Cẩm Trung.","Tôi muốn đăng ký khám tại trạm y tế xã thì làm thế nào?","Tôi muốn hỏi về bảo hiểm y tế."]},
"An sinh xã hội":{icon:"🤝",desc:"Chính sách hỗ trợ và an sinh xã hội",suggestions:["Tôi muốn biết hộ nghèo, hộ cận nghèo được hưởng chính sách gì?","Tôi muốn hỏi về trợ cấp xã hội hàng tháng.","Tôi muốn hỏi về chính sách đối với người có công."]},
"Doanh nghiệp":{icon:"🏢",desc:"Hộ kinh doanh, doanh nghiệp và hỗ trợ sản xuất",suggestions:["Hộ kinh doanh cần làm thủ tục gì?","Tôi muốn đăng ký hộ kinh doanh mới thì bắt đầu từ đâu?","Tôi muốn biết thông tin về các chương trình hỗ trợ doanh nghiệp."]},
"Chuyển đổi số":{icon:"💻",desc:"i-Hà Tĩnh, kỹ năng số và an toàn trên mạng",suggestions:["Tôi muốn sử dụng ứng dụng i-Hà Tĩnh thì bắt đầu từ đâu?","Bình dân học vụ số là gì?","Tôi nghi ngờ bị lừa đảo trên mạng thì phải làm gì?"]}
};
const MAIN_CATEGORIES=Object.keys(CATEGORY_META);
let faqData=[],currentCategory="Thông tin chung",docFreq=new Map();

const menu=document.getElementById("categoryMenu"),suggestions=document.getElementById("suggestions"),
messages=document.getElementById("chatMessages"),input=document.getElementById("questionInput"),
sendBtn=document.getElementById("sendBtn"),clearBtn=document.getElementById("clearBtn"),
currentTitle=document.getElementById("currentTitle"),currentDesc=document.getElementById("currentDesc");

function normalize(s=""){return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/[“”‘’"'`.,!?;:()[\]{}<>/\\|@#$%^&*_+=~\-]/g," ").replace(/\s+/g," ").trim();}
const STOP=new Set("toi cho hoi muon can co the duoc lam nao gi ve la va o tai cua xin vui long hay mot nhu thi khong nho voi anh chi em nguoi nay day tren den tu de neu".split(" "));
function words(s){return [...new Set(normalize(s).split(" ").filter(x=>x.length>=2&&!STOP.has(x)))];}
function phraseScore(text,phrase){let t=normalize(text),p=normalize(phrase);if(!p)return 0;if(t===p)return 12;if(t.includes(p))return p.split(" ").length>1?7:3;return 0;}

const CAT_TERMS={
"Thông tin chung":["ubnd","uy ban","bo phan mot cua","gio lam viec","lien he","dia chi","so dien thoai","can bo"],
"Dịch vụ công":["dich vu cong","nop ho so","ho so truc tuyen","truc tuyen","tra cuu ho so","tiep nhan","bo sung ho so"],
"Hộ tịch":["khai sinh","khai tu","ket hon","ho tich","tinh trang hon nhan"],
"Đất đai":["dat dai","so do","giay chung nhan","quyen su dung dat","tach thua","hop thua","quy hoach","chuyen muc dich"],
"Xây dựng":["xay dung","xay nha","sua nha","giay phep xay dung","cong trinh"],
"Giáo dục":["giao duc","truong hoc","tuyen sinh","hoc sinh","giao vien","chuyen truong","mam non","tieu hoc","thcs"],
"Y tế":["y te","tram y te","kham","benh","bao hiem y te","bhyt"],
"An sinh xã hội":["an sinh","ho ngheo","can ngheo","tro cap","nguoi co cong","bao tro","chinh sach"],
"Doanh nghiệp":["doanh nghiep","ho kinh doanh","dang ky kinh doanh","san xuat","kinh doanh","ho tro doanh nghiep"],
"Chuyển đổi số":["chuyen doi so","i ha tinh","binh dan hoc vu so","ky nang so","lua dao tren mang","so hoa"]
};
const INTENTS={
"thủ tục":["thu tuc","lam the nao","bat dau tu dau","can gi","giay to","ho so","dang ky","nop"],
"điều kiện":["dieu kien","co duoc khong","co can","yeu cau"],
"thời gian":["bao lau","thoi gian","may ngay","khi nao"],
"chi phí":["bao nhieu","phi","le phi","chi phi"],
"địa điểm":["o dau","dia diem","noi nao","cho nao","bo phan nao"],
"tra cứu":["tra cuu","kiem tra","theo doi","tinh trang"],
"phản ánh":["phan anh","kien nghi","gop y","bao cao"]
};

function detectCategory(q){
 let best=currentCategory,bs=0;
 for(const [cat,terms] of Object.entries(CAT_TERMS)){
   let s=terms.reduce((a,t)=>a+phraseScore(q,t),0);
   if(s>bs){bs=s;best=cat;}
 }
 return best;
}
function buildDF(){
 const df=new Map();
 faqData.forEach(x=>new Set(words(`${x.question} ${(x.keywords||[]).join(" ")}`)).forEach(w=>df.set(w,(df.get(w)||0)+1)));
 return df;
}
function faqScore(q,item){
 const qn=normalize(q), text=`${item.question} ${(item.keywords||[]).join(" ")} ${item.category||""}`;
 let s=phraseScore(qn,item.question)*2;
 const iw=new Set(words(text));
 words(q).forEach(w=>{if(iw.has(w)){const idf=1+Math.log((faqData.length+1)/((docFreq.get(w)||1)+1));s+=1.5*idf;}});
 (item.keywords||[]).forEach(k=>s+=phraseScore(qn,k)*1.5);
 const detected=detectCategory(q);
 if(normalize(item.category||"")===normalize(detected))s+=4;
 if(normalize(item.category||"")===normalize(currentCategory))s+=2;
 return s;
}
function findAnswer(q){
 const ranked=faqData.map(item=>({item,score:faqScore(q,item)})).sort((a,b)=>b.score-a.score);
 const best=ranked[0],second=ranked[1]?.score||0;
 if(!best||best.score<5)return {answer:"Tôi chưa tìm thấy câu trả lời đủ chính xác trong kho dữ liệu hiện tại. Anh/chị hãy nêu rõ thủ tục hoặc vấn đề cần hỗ trợ; ví dụ: “đăng ký khai sinh cần giấy tờ gì?”",category:detectCategory(q)};
 return {answer:best.item.answer,category:best.item.category||detectCategory(q),confidence:(best.score>=10||best.score-second>=3)?"cao":"khá"};
}
function renderMenu(){
 menu.innerHTML=MAIN_CATEGORIES.map(c=>`<button class="category-btn ${c===currentCategory?"active":""}" data-category="${c}"><span class="category-icon">${CATEGORY_META[c].icon}</span><span>${c}</span></button>`).join("");
 menu.querySelectorAll(".category-btn").forEach(b=>b.onclick=()=>selectCategory(b.dataset.category));
}
function selectCategory(c){currentCategory=c;currentTitle.textContent=c;currentDesc.textContent=CATEGORY_META[c].desc;renderMenu();renderSuggestions();}
function renderSuggestions(){
 suggestions.innerHTML=(CATEGORY_META[currentCategory].suggestions||[]).map(q=>`<button class="suggestion">${q}</button>`).join("");
 suggestions.querySelectorAll(".suggestion").forEach(b=>b.onclick=()=>ask(b.textContent));
}
function addMessage(text,type,meta=""){
 const d=document.createElement("div");d.className=`message ${type}`;
 d.innerHTML=`<div class="avatar">${type==="bot"?"AI":"Bạn"}</div><div class="bubble"><strong>${type==="bot"?"AI Cẩm Trung":"Bạn"}</strong><p></p>${meta?`<small class="answer-meta">${meta}</small>`:""}</div>`;
 d.querySelector("p").textContent=text;messages.appendChild(d);messages.scrollTop=messages.scrollHeight;
}
function ask(q){
 q=q.trim();if(!q)return;addMessage(q,"user");input.value="";input.style.height="auto";
 setTimeout(()=>{const r=findAnswer(q);addMessage(r.answer,"bot",`Lĩnh vực: ${r.category} · Độ phù hợp: ${r.confidence||"thấp"}`)},180);
}
sendBtn.onclick=()=>ask(input.value);
input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();ask(input.value);}});
input.addEventListener("input",()=>{input.style.height="auto";input.style.height=Math.min(input.scrollHeight,130)+"px";});
clearBtn.onclick=()=>{messages.innerHTML=`<div class="message bot"><div class="avatar">AI</div><div class="bubble"><strong>AI Cẩm Trung</strong><p>Đã làm mới cuộc trò chuyện. Anh/chị hãy chọn lĩnh vực hoặc đặt câu hỏi.</p></div></div>`;};
async function loadFAQ(){
 try{const r=await fetch("data/faq.json");if(!r.ok)throw Error(r.status);faqData=await r.json();docFreq=buildDF();}
 catch(e){addMessage("Không tải được kho dữ liệu FAQ. Vui lòng kiểm tra file data/faq.json.","bot");}
 renderMenu();selectCategory(currentCategory);
}
loadFAQ();
