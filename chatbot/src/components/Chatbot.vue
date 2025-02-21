<template>
  <div class="flex h-full w-full px-2">
    <!-- Left Pane -->
    <div class="w-64 border-r p-4 overflow-y-auto relative ">

      <h3 class="font-semibold mb-2">Lịch sử Chat</h3>
      <ul class="">
        <li v-for="(history, index) in chatHistory" :key="index" @click="loadChat(history)"
          class="cursor-pointer hover:bg-gray-100 p-2 rounded">
          <p class="text-xs text-gray-600">{{ formatDate(history.timestamp) }}</p>
          <p class="text-sm">{{ truncateText(history.messages[1].content, 50) }}</p>
        </li>
      </ul>
      <button @click="clearChatHistory"
        class="bg-red-500 hover:bg-red-700 absolute bottom-2 right-2 text-white font-bold py-2 px-4 rounded">Xóa Lịch
        Sử</button>
    </div>

    <!-- Chat Box Container -->
    <div class="flex-1 flex flex-col">
      <div class="shadow h-12 flex items-center justify-between p-4">
        <div class="flex gap-4">
          <button @click="createNewChat" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Tạo đoạn chat mới
          </button>
          <label class="flex gap-2 items-center">
            <span class="text-gray-700">Hiện suy nghĩ</span>
            <input type="checkbox" v-model="showThinking" class="form-checkbox h-5 w-5 text-blue-600" />
          </label>
        </div>
        <p class="font-bold">AI Chatbot</p>
      </div>
      <!-- Chat Box -->
      <div ref="chatBox" class="flex-1 p-4 overflow-y-auto">
        <div v-for="(message, index) in messages" :key="index" :class="message.role">
          <p :class="{
            'bg-gray-100 text-gray-800 rounded-xl p-2 mb-2 max-w-fit': message.role === 'assistant',
            'bg-blue-500 text-white rounded-xl p-2 mb-2 self-end max-w-fit': message.role === 'user',
          }" v-html="message.content">
          </p>
        </div>
        <div v-if="isTyping" class="assistant typing">
          <p class="bg-gray-100 text-gray-800 rounded-xl p-2 mb-2 max-w-fit">Đang nhập...</p>
        </div>
      </div>

      <!-- Input Container -->
      <div class="w-full p-4 flex items-center">
        <input v-model="userMessage" @keyup.enter="sendMessage" placeholder="Nhập tin nhắn..." :disabled="isTyping"
          class="w-full border rounded-full py-2 px-4 mr-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button @click="sendMessage" :disabled="isTyping"
          class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full disabled:opacity-50">
          Gửi
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUpdated, nextTick, computed } from "vue";
import { chatWithGroq } from "@/services/groqService";
import { marked } from "marked";
import katex from "katex";
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css'; // Chọn một theme highlight.js

export default {
  setup() {
    const messages = ref([{ role: "assistant", content: "Xin chào! Tôi có thể giúp gì?" }]);
    const userMessage = ref("");
    const isTyping = ref(false);
    const chatBox = ref(null);
    const chatHistory = ref([]);
    const showThinking = ref(true);

    const scrollToBottom = async () => {
      await nextTick();
      if (chatBox.value) {
        chatBox.value.scrollTop = chatBox.value.scrollHeight;
      }
    };
    const saveChat = (currentMessages) => {  // Nhận messages làm tham số
      const timestamp = new Date();
      chatHistory.value.unshift({
        timestamp: timestamp,
        messages: [...currentMessages], // Sử dụng tham số
      });

      // Lưu vào localStorage (tùy chọn)
      localStorage.setItem('chatHistory', JSON.stringify(chatHistory.value));
    };

    const loadChat = (history) => {
      messages.value = [...history.messages];
      scrollToBottom();
    };

    const createNewChat = () => {
      // Lưu cuộc trò chuyện hiện tại nếu có
      if (messages.value.length > 1) {
        // Tránh lưu cuộc trò chuyện mặc định chỉ có tin nhắn "Xin chào!"
        saveChat(messages.value); // Lưu cuộc trò chuyện hiện tại
      }

      // Tạo mới cuộc trò chuyện
      messages.value = [{ role: "assistant", content: "Xin chào! Tôi có thể giúp gì?" }]; // Thiết lập tin nhắn ban đầu
      userMessage.value = "";
      scrollToBottom();
    };

    const sendMessage = async () => {
      if (!userMessage.value.trim() || isTyping.value) return;

      messages.value.push({ role: "user", content: userMessage.value });
      const currentMessage = userMessage.value;
      userMessage.value = "";
      await scrollToBottom();

      isTyping.value = true;

      try {
        const botResponse = await chatWithGroq(
          messages.value.map((msg) => ({
            role: msg.role === "assistant" ? "assistant" : "user",
            content: msg.content,
          }))
        );

        messages.value.push({ role: "assistant", content: botResponse });
      } catch (error) {
        console.error("Error getting response:", error);
        messages.value.push({
          role: "assistant",
          content: "Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.",
        });
      } finally {
        isTyping.value = false;
        await scrollToBottom();
        //saveChat(); // Lưu chat sau khi nhận được phản hồi  //Di chuyển vào createNewChat
      }
    };

    const formatDate = (date) => {
      return new Date(date).toLocaleString();
    };

    const truncateText = (text, length) => {
      if (text && text.length > length) {
        return text.substring(0, length) + "...";
      }
      return text || ""; 
    };

    const renderMessage = (text) => {
  // 1. Render Markdown
  let html = marked.parse(text, { breaks: true, mangle: false, xhtml: true });

  // 2. Render LaTeX (inline) - `$...$`
  html = html.replace(/\$(.+?)\$/g, (_, latex) => {
    try {
      return katex.renderToString(latex.trim(), {
        throwOnError: false,
        displayMode: false, // Inline mode
      });
    } catch (error) {
      console.error("Error rendering inline LaTeX:", error);
      return `<span class="text-red-500">Lỗi LaTeX: ${latex}</span>`;
    }
  });

  // 3. Render LaTeX (display mode) - `$$...$$`
  html = html.replace(/\$\$(.+?)\$\$/gs, (_, latex) => {
    try {
      return katex.renderToString(latex.trim(), {
        throwOnError: false,
        displayMode: true, // Display mode
      });
    } catch (error) {
      console.error("Error rendering display LaTeX:", error);
      return `<span class="text-red-500">Lỗi LaTeX: ${latex}</span>`;
    }
  });

  // 4. Highlight Code
  html = html.replace(/<pre><code class="language-(\w+)">(.*?)<\/code><\/pre>/gs, (_, language, code) => {
    try {
      const validLang = hljs.getLanguage(language) ? language : 'plaintext';
      const highlightedCode = hljs.highlight(code.trim(), { language: validLang }).value;
      return `<pre><code class="hljs language-${validLang}">${highlightedCode}</code></pre>`;
    } catch (error) {
      console.error("Error highlighting code:", error);
      return `<pre><code class="hljs">${code}</code></pre>`;
    }
  });

  return html;
};


    const processedMessages = computed(() => {
      return messages.value.map(message => {
        let content = message.content;
        if (!showThinking.value && message.role === 'assistant') {
          // Ẩn thẻ <thinking>...</thinking> nếu checkbox không được chọn
          content = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '');
        }
        return { ...message, content: content }; // Trả về bản sao đã sửa đổi
      });
    });

    const clearChatHistory = () => {
      chatHistory.value = []; // Xóa lịch sử chat
      localStorage.removeItem('chatHistory'); // Xóa khỏi localStorage
    };

    onMounted(() => {
      scrollToBottom();
      // Tải lịch sử từ localStorage (nếu có)
      const storedHistory = localStorage.getItem('chatHistory');
      if (storedHistory) {
        chatHistory.value = JSON.parse(storedHistory);
      }
    });

    onUpdated(() => {
      scrollToBottom();
    });

    return {
      messages,
      userMessage,
      sendMessage,
      isTyping,
      chatBox,
      chatHistory,
      loadChat,
      formatDate,
      truncateText,
      createNewChat,
      showThinking, // Thêm showThinking để template có thể truy cập
      processedMessages,
      clearChatHistory// Thêm createNewChat vào danh sách trả về
    };
  },
};
</script>
<style>
@import 'katex/dist/katex.min.css';
</style>