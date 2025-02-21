function combineDialogText(dialogData) {
    let combinedText = "";
  
    for (const turn of dialogData.dialog) {
      combinedText += `${turn.role}: ${turn.text}\n`; // Add role and text, then a newline
    }
  
    return combinedText;
  }
  
  
  // Example usage (assuming 'data' is your JSON object loaded as shown in the previous Python example):
  const combinedText = combineDialogText(data);
  console.log(combinedText);
  
  
  // Example using fetch (if your JSON is from a URL):
  fetch('./data/jameslan.json')  // Replace with your actual path/URL
    .then(response => response.json())
    .then(data => {
      const combinedText = combineDialogText(data);
      console.log(combinedText);
    })
    .catch(error => console.error('Error fetching JSON:', error));