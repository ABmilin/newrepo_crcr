import { supabase } from "./supabaseClient.js";

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    alert("ログイン失敗: " + error.message);
  } else {
    alert("ログイン成功！");
    window.location.href = "/"; // トップページへ遷移
  }
});

document.getElementById("signupBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    alert("登録失敗: " + error.message);
  } else {
    alert("確認メールを送信しました。");
  }
});
