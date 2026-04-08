const btnPiper = document.getElementById('btnPiper');

if (btnPiper) {
  btnPiper.addEventListener('click', async () => {
    const apiKey = document.getElementById('apiKey').value.trim();
    const desc = document.getElementById('videoDesc').value.trim();
    const tipo = document.getElementById('tipo').value;
    const tono = document.getElementById('tono').value;
    const ciudad = document.getElementById('ciudad').value.trim() || 'Paraná';
    const resultBox = document.getElementById('piperResult');

    if (!apiKey) {
      alert('Falta API Key');
      return;
    }

    if (!desc) {
      alert('Falta descripción del video');
      return;
    }

    resultBox.innerHTML = '<p>Generando contenido...</p>';

    const prompt = `
Sos community manager de una veterinaria en ${ciudad}, Argentina.

Descripción del video:
${desc}

Tipo de contenido: ${tipo}
Tono de la clínica: ${tono}

Respondé SOLO con JSON válido, sin texto antes ni después, sin markdown, sin backticks.

Formato exacto:
{
  "caption": "texto corto para Instagram",
  "hashtags": "#tag1 #tag2 #tag3",
  "horario": "día y hora recomendada con explicación breve",
  "tip_extra": "tip corto para sumar al contenido"
}
`;

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: 'Debes responder únicamente con JSON válido.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 700,
          temperature: 0.8
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || `Error ${res.status}`);
      }

      const raw = data?.choices?.[0]?.message?.content || '';

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (e1) {
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) {
          throw new Error('La respuesta de OpenAI no vino en JSON válido.');
        }
        try {
          parsed = JSON.parse(match[0]);
        } catch (e2) {
          console.error('RAW OpenAI:', raw);
          throw new Error('No se pudo interpretar el JSON devuelto por OpenAI.');
        }
      }

      const caption = parsed.caption || '';
      const hashtags = parsed.hashtags || '';
      const horario = parsed.horario || '';
      const tip = parsed.tip_extra || '';

      resultBox.innerHTML = `
        <div style="display:grid;gap:12px;">
          <div style="padding:12px;border:1px solid #ddd;border-radius:10px;background:#fff;">
            <h3 style="margin-bottom:8px;">Caption</h3>
            <p style="white-space:pre-wrap;">${escapeHtml(caption)}</p>
            <button type="button" onclick="copyText(${JSON.stringify(caption)})">Copiar caption</button>
          </div>

          <div style="padding:12px;border:1px solid #ddd;border-radius:10px;background:#fff;">
            <h3 style="margin-bottom:8px;">Hashtags</h3>
            <p style="white-space:pre-wrap;">${escapeHtml(hashtags)}</p>
            <button type="button" onclick="copyText(${JSON.stringify(hashtags)})">Copiar hashtags</button>
          </div>

          <div style="padding:12px;border:1px solid #ddd;border-radius:10px;background:#fff;">
            <h3 style="margin-bottom:8px;">Horario sugerido</h3>
            <p style="white-space:pre-wrap;">${escapeHtml(horario)}</p>
          </div>

          <div style="padding:12px;border:1px solid #ddd;border-radius:10px;background:#fff;">
            <h3 style="margin-bottom:8px;">Tip extra</h3>
            <p style="white-space:pre-wrap;">${escapeHtml(tip)}</p>
            <button type="button" onclick="copyText(${JSON.stringify(tip)})">Copiar tip</button>
          </div>
        </div>
      `;
    } catch (err) {
      console.error(err);
      resultBox.innerHTML = `
        <div style="padding:12px;border:1px solid #f3b0b0;border-radius:10px;background:#fff5f5;color:#a40000;">
          Error: ${escapeHtml(err.message)}
        </div>
      `;
    }
  });
}

function copyText(text) {
  navigator.clipboard.writeText(text)
    .then(() => alert('Copiado'))
    .catch(() => alert('No se pudo copiar'));
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
