const API_URL = "https://script.google.com/macros/s/AKfycbzvUe0k-BiOUiyapzI_LsFC5Jp_CwlliT1qjjayeIm5VSO5qGcF2uwDlsERQg26PA7frw/exec";

async function generar() {
  const file = document.getElementById("file").files[0];
  const texto = document.getElementById("texto").value;

  const base64 = await toBase64(file);

  const res = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      image: base64,
      texto: texto
    })
  });

  const data = await res.json();

  if (data.ok) {
    document.getElementById("preview").src = data.image;
    document.getElementById("caption").value = data.caption;
  } else {
    alert("Error: " + data.error);
  }
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}
