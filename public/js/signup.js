const btn = document.getElementById("btn");
const errorBox = document.getElementById("error");

btn.onclick = async () => {
  errorBox.style.display = "none";

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!name || !email || !password) {
    errorBox.textContent = "All fields are required";
    errorBox.style.display = "block";
    return;
  }

  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      errorBox.textContent = data.message || "Signup failed";
      errorBox.style.display = "block";
      return;
    }

    alert("Account created successfully. Please login.");
    window.location.href = "/";
  } catch (err) {
    errorBox.textContent = "Server error";
    errorBox.style.display = "block";
  }
};
