const BASE = "http://localhost:5001/api";
async function request(path, options={}) {
  let response;
  try { response = await fetch(BASE + path, { headers: {"Content-Type":"application/json"}, ...options }); }
  catch { throw new Error("Cannot reach Express. Start the backend terminal on port 5000."); }
  const data = await response.json().catch(()=>({}));
  if (!response.ok) throw new Error(data.message || data.error || `Request failed (${response.status})`);
  return data;
}
export const api = {
 health:()=>request("/health"), books:()=>request("/books"),
 addBook:b=>request("/books",{method:"POST",body:JSON.stringify(b)}),
 updateBook:(id,b)=>request("/books/"+id,{method:"PUT",body:JSON.stringify(b)}),
 deleteBook:id=>request("/books/"+id,{method:"DELETE"}),
 users:()=>request("/users"), addUser:u=>request("/users",{method:"POST",body:JSON.stringify(u)}),
 login:id=>request("/login",{method:"POST",body:JSON.stringify({membership_id:id})}),
 dashboard:()=>request("/dashboard"), transactions:()=>request("/transactions")
};
