export const detectLanguage = async (text: string) => {
    const response = await fetch("http://localhost:3000/detect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q:text }),
    });
    const data = await response.json();
    return data.data;
  };
  
  export const translateText = async (text: string, targetLang: string) => {
    const response = await fetch("http://localhost:3000/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({q:text, target: targetLang}),
    });
    const data = await response.json();
    console.log(data);
    return data.data.translations[0].translatedText;
  };