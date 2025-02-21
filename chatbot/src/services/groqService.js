import axios from "axios";

const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export async function chatWithGroq(messages) {
  try {
    // Tạo một bản sao của messages để tránh thay đổi trực tiếp dữ liệu truyền vào
    const processedMessages = [...messages];
    
    // Thêm hướng dẫn về định dạng thinking vào system message hoặc tạo mới nếu chưa có
    let systemMessageExists = false;
    
    for (let i = 0; i < processedMessages.length; i++) {
      if (processedMessages[i].role === 'system') {
        processedMessages[i].content += "\nKhi bạn cần suy nghĩ về một vấn đề phức tạp, hãy đặt quá trình suy nghĩ của bạn trong thẻ <thinking>...</thinking> riêng biệt, và sau đó cung cấp kết luận cuối cùng của bạn bên ngoài thẻ.";
        systemMessageExists = true;
        break;
      }
    }
    
    if (!systemMessageExists) {
      processedMessages.unshift({
        role: 'system',
        content: "Bạn là một trợ lý AI hữu ích. Khi bạn cần suy nghĩ về một vấn đề phức tạp, hãy đặt quá trình suy nghĩ của bạn trong thẻ <thinking>...</thinking> riêng biệt, và sau đó cung cấp kết luận cuối cùng của bạn bên ngoài thẻ."
      });
    }
    
    const response = await axios.post(
      API_URL,
      {
        model: "mixtral-8x7b-32768",
        messages: processedMessages,
        temperature: 0.7,
        max_tokens: 4000, // Đảm bảo có đủ tokens cho phản hồi dài
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    
    let responseContent = response.data.choices[0].message.content;
    
    // Đảm bảo định dạng thinking phù hợp
    // Nếu nội dung có chứa thẻ thinking, giữ nguyên
    // Nếu không, thử phân tích cú pháp để tìm phần thinking
    if (!responseContent.includes('<thinking>')) {
      // Tìm kiếm các mẫu thông thường cho quá trình suy nghĩ
      const thinkingPatterns = [
        { start: "Let me think about this...", end: "\nOkay, based on my thinking" },
        { start: "I need to consider...", end: "\nAfter considering" },
        { start: "Let's analyze this step by step:", end: "\nBased on the above analysis" },
        { start: "Thinking: ", end: "\nConclusion: " }
      ];
      
      for (const pattern of thinkingPatterns) {
        const startIndex = responseContent.indexOf(pattern.start);
        const endIndex = responseContent.indexOf(pattern.end);
        
        if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
          const thinkingPart = responseContent.substring(startIndex, endIndex + pattern.end.length);
          const contentBeforeThinking = responseContent.substring(0, startIndex);
          const contentAfterThinking = responseContent.substring(endIndex + pattern.end.length);
          
          responseContent = contentBeforeThinking + 
                           '<thinking>' + thinkingPart + '</thinking>' + 
                           contentAfterThinking;
          break;
        }
      }
    }
    
    return responseContent;
  } catch (error) {
    console.error("Error fetching response from Groq:", error);
    return "Xin lỗi, tôi không thể trả lời ngay bây giờ. Đã xảy ra lỗi khi kết nối với dịch vụ AI.";
  }
}