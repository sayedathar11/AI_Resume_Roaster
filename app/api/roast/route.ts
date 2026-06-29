import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';

const API_URL = 'https://api.groq.ai/v1/complete';

function buildPrompt(resumeText: string, severity: string) {
  return `You are an expert resume reviewer. Respond with a concise, professional roast that matches the following severity level: ${severity}. Keep the tone savage but useful. Do not fabricate skills or experience beyond what is in the resume.

Resume Text:
${resumeText}

Return:
1) A short roast paragraph.
2) A list of 4-6 bullet-point fixes for formatting, clarity, impact, ATS, and phrasing.

Use a shareable format and keep the roast direct.`;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const resumeFile = formData.get('resume');
  const severity = String(formData.get('severity') ?? 'Spicy');

  if (!resumeFile || typeof resumeFile === 'string') {
    return NextResponse.json({ error: 'Resume file is required.' }, { status: 400 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing Groq API key. Set GROQ_API_KEY in env.' }, { status: 500 });
  }

  const fileBuffer = Buffer.from(await resumeFile.arrayBuffer());

  let resumeText = '';
  try {
    const parsed = await pdfParse(fileBuffer);
    resumeText = parsed.text.trim();
  } catch (error) {
    return NextResponse.json({ error: 'Unable to parse PDF. Make sure it is a valid resume PDF.' }, { status: 400 });
  }

  if (!resumeText) {
    return NextResponse.json({ error: 'Resume PDF contains no readable text.' }, { status: 400 });
  }

  const prompt = buildPrompt(resumeText.slice(0, 3000), severity);

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'groq-1.5-mini',
      input: prompt,
      max_output_tokens: 700,
      temperature: severity === 'Nuclear' ? 0.8 : severity === 'Spicy' ? 0.65 : 0.4,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json({ error: `Groq API error: ${text}` }, { status: 500 });
  }

  const json = await response.json();
  const roast =
    json.output_text ||
    json.output?.[0]?.content?.find((item: any) => item.type === 'output_text')?.text ||
    json.output?.[0]?.content?.[0]?.text ||
    json.completion ||
    json.choices?.[0]?.text ||
    '';

  return NextResponse.json({ roast });
}
