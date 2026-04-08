// ==========================
// PIPER IA
// ==========================

document.getElementById('btnPiper').addEventListener('click', async () => {

  const apiKey = document.getElementById('apiKey').value.trim();
  const desc = document.getElementById('videoDesc').value;
  const tipo = document.getElementById('tipo').value;
  const tono = document.getElementById('tono').value;
  const ciudad = document.getElementById('ciudad').value;

  if (!apiKey) return alert('Falta API KEY');
  if (!desc) return alert('Falta descripción');

  const prompt = `
Sos community manager veterinario en ${ciudad}.

Descripción:
${desc}

Tipo: ${tipo}
Tono: ${tono}

Generá JSON:
{
"caption":"",
"hashtags":"",
"horario":"",
"tip_extra":""
}
`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await res.json();
  const raw = data.choices[0].message.content;

  const clean = raw.replace(/```json|```/g, '').trim();
  const json = JSON.parse(clean);

  document.getElementById('piperResult').innerHTML = `
    <h3>Caption</h3>
    <p>${json.caption}</p>
    <button onclick="copyText(\`${json.caption}\`)">Copiar</button>

    <h3>Hashtags</h3>
    <p>${json.hashtags}</p>
    <button onclick="copyText(\`${json.hashtags}\`)">Copiar</button>

    <h3>Tip</h3>
    <p>${json.tip_extra}</p>
  `;
});

function copyText(text){
  navigator.clipboard.writeText(text);
  alert("Copiado");
}
