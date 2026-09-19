async function testImport() {
  const payload = {
    id: "1047",
    stem: "A 78-year-old man comes to the office duo to a one-month history of progressive dyspnea...",
    choices: [
      { text: "Ascorbic acid", image: { data: "", size: "default", fileName: "" } },
      { text: "Cobalamin", image: { data: "", size: "default", fileName: "" } },
      { text: "Niacin", image: { data: "", size: "default", fileName: "" } },
      { text: "Pyridoxine", image: { data: "", size: "default", fileName: "" } },
      { text: "Retinol", image: { data: "", size: "default", fileName: "" } },
      { text: "Riboflavin", image: { data: "", size: "default", fileName: "" } },
      { text: "Thiamine", image: { data: "", size: "default", fileName: "" } }
    ],
    correct: "G",
    system: "Cardiovascular",
    subject: "Biochemistry",
    topic: "Vitamin deficiencies",
    explanationCorrect: "Thiamine deficiency causes beriberi and Wernicke-Korsakoff syndrome...",
    explanationWrong: "(Choice A) Ascorbic acid...\n(Choice B) Vitamin B12...",
    summary: "Thiamine deficiency causes beriberi and Wernicke-Korsakoff syndrome.",
    productId: "8053", // Using a common ID from your DB
    packageId: "8053"
  };

  try {
    console.log('Sending request to http://localhost:3000/api/questions...');
    const res = await fetch('http://localhost:3000/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log('Status:', res.status);
    const text = await res.text();
    if (text.includes('<!DOCTYPE')) {
      console.log('ERROR: Received HTML instead of JSON');
      // console.log(text);
    } else {
      console.log('Response:', JSON.parse(text));
    }
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

testImport();
