// @ts-nocheck

import { useState, useEffect, useRef } from 'react';
import { Bot, NotebookPen, FileText, Plus, Send, X, Maximize2, ArrowLeft, Sparkles, Search, Menu } from 'lucide-react'; // Import Menu icon for the toggle button

enum AgentType {
  HABIT_TRACKER = 'habit-tracker',
  PHYSICS_NOTES = 'physics-notes',
  DESKTOP_AGENT = 'desktop-agent',
  CUSTOM_NOTION = 'custom-notion',
  SEARCH = 'search'
}

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
}

interface Agent {
  id: string;
  name: string;
  type: AgentType;
  avatar: string;
  description: string;
  messages: Message[];
  notionId?: string; // For custom notion agents
  pageId?: string;   // For custom notion agents
}

function App() {
  const [prompt, setPrompt] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [chatMode, setChatMode] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Add this state for loading indication
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State to control sidebar visibility
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Add this function to make API calls
  const callAgentAPI = async (endpoint: string, data: any) => {
    try {
      const response = await fetch(`http://localhost:8000/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error calling agent API:', error);
      throw error;
    }
  };

  const handleGenerateAgent = async () => {
    if (!prompt.trim()) return;

    let agentType: AgentType;
    let agentName: string;
    let notionId: string | undefined;
    let pageId: string | undefined;

    if (prompt.toLowerCase().endsWith('habit tracker')) {
      agentType = AgentType.HABIT_TRACKER;
      agentName = 'Habit Tracker Assistant';
    } else if (prompt.toLowerCase().endsWith('physics notes')) {
      agentType = AgentType.PHYSICS_NOTES;
      agentName = 'Physics Notes Assistant';
    } else if (prompt.toLowerCase().startsWith('code me an app')) {
      agentType = AgentType.DESKTOP_AGENT;
      agentName = 'Desktop App Developer';
    } else if (prompt.toLowerCase().startsWith('create me an agent to')) {
      agentType = AgentType.CUSTOM_NOTION;
      agentName = 'Custom Notion Agent';
      
      // Generate an ID for the Notion database
      notionId = `CustomNotion-${Date.now().toString(36)}`;
      
      // Create the custom Notion agent on the backend
      try {
        const response = await callAgentAPI('create-custom-notion-agent', { notion_id: notionId });
        console.log('Custom agent created:', response);
      } catch (error) {
        console.error('Failed to create custom agent:', error);
      }
    } else if (prompt.toLowerCase().startsWith('search for')) {
      agentType = AgentType.SEARCH;
      agentName = 'Search Assistant';
    } else {
      return;
    }

    const newAgent: Agent = {
      id: Date.now().toString(),
      name: agentName,
      type: agentType,
      avatar: `https://source.unsplash.com/random/200x200?${agentType},${Date.now()}`,
      description: prompt,
      messages: [],
      notionId,
      pageId
    };

    setAgents([...agents, newAgent]);
    setPrompt('');
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || !selectedAgent) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: currentMessage,
      sender: 'user',
      timestamp: new Date()
    };

    // Add user message to the chat immediately
    const updatedAgentWithUserMessage = {
      ...selectedAgent,
      messages: [...selectedAgent.messages, newMessage]
    };
    
    setAgents(agents.map(agent => 
      agent.id === selectedAgent.id ? updatedAgentWithUserMessage : agent
    ));
    setSelectedAgent(updatedAgentWithUserMessage);
    setCurrentMessage('');
    
    // Show loading state
    setIsLoading(true);

    try {
      let endpoint: string;
      let payload: any = { message: currentMessage };
      
      // Determine the endpoint based on agent type
      switch (selectedAgent.type) {
        case AgentType.HABIT_TRACKER:
          endpoint = 'habit-tracker';
          break;
        case AgentType.PHYSICS_NOTES:
          endpoint = 'physics-notes';
          break;
        case AgentType.DESKTOP_AGENT:
          endpoint = 'desktop-agent';
          break;
        case AgentType.SEARCH:
          endpoint = 'search';
          // Use 'query' instead of 'message' as per the curl example
          payload = { query: currentMessage };
          break;
        case AgentType.CUSTOM_NOTION:
          endpoint = 'custom-notion';
          
          // Check if message contains the pipe separator
          if (currentMessage.includes('|')) {
            // Split the message by the pipe
            const [actualMessage, fullNotionId] = currentMessage.trim().split('|').map(part => part.trim());
            
            // Extract the page ID (part after the dash)
            const pageId = fullNotionId.includes('-') ? 
              fullNotionId.split('-')[1] : '';
            
            // Add Notion-specific parameters with the extracted values
            payload = { 
              message: actualMessage, 
              notion_id: fullNotionId,  // Use the full notion ID (abc-dxz)
              page_id: pageId           // Use the extracted page ID (dxz)
            };
          } else {
            // If no pipe format, use default behavior
            payload = { 
              ...payload, 
              notion_id: selectedAgent.notionId || '', 
              page_id: selectedAgent.pageId || '' 
            };
          }
          break;
      }
      
      // Call the API
      const response = await callAgentAPI(endpoint, payload);
      
      // Create agent response from API response
      const agentResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: Array.isArray(response.messages) ? response.messages.join('\n') : response.messages,
        sender: 'agent',
        timestamp: new Date()
      };
      
      // Update the agent with the response
      const finalUpdatedAgent = {
        ...updatedAgentWithUserMessage,
        messages: [...updatedAgentWithUserMessage.messages, agentResponse]
      };
      
      setAgents(agents.map(agent => 
        agent.id === selectedAgent.id ? finalUpdatedAgent : agent
      ));
      setSelectedAgent(finalUpdatedAgent);
    } catch (error) {
      // Handle error
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I encountered an error while processing your request. Please try again.",
        sender: 'agent',
        timestamp: new Date()
      };
      
      const updatedAgentWithError = {
        ...updatedAgentWithUserMessage,
        messages: [...updatedAgentWithUserMessage.messages, errorMessage]
      };
      
      setAgents(agents.map(agent => 
        agent.id === selectedAgent.id ? updatedAgentWithError : agent
      ));
      setSelectedAgent(updatedAgentWithError);
    } finally {
      // Hide loading state
      setIsLoading(false);
    }
  };

  const handleOpenChat = () => {
    setChatMode(true);
    setCurrentMessage(''); // Clear the input when opening chat
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (selectedAgent) {
      scrollToBottom();
    }
  }, [selectedAgent?.messages]);

  const getAgentIcon = (type: AgentType) => {
    switch (type) {
      case AgentType.HABIT_TRACKER:
        return <Sparkles className="w-4 h-4" />;
      case AgentType.PHYSICS_NOTES:
        return <FileText className="w-4 h-4" />;
      case AgentType.DESKTOP_AGENT:
        return <Bot className="w-4 h-4" />;
      case AgentType.CUSTOM_NOTION:
        return <NotebookPen className="w-4 h-4" />;
      case AgentType.SEARCH:
        return <Search className="w-4 h-4" />;
    }
  };

  const ChatInterface = () => (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 to-gray-800 overflow-hidden">
      {/* Chat Header - Update the background */}
      <div className="bg-gray-800/50 backdrop-blur-sm p-4 flex items-center gap-4 border-b border-gray-700">
        <button 
          onClick={() => setChatMode(false)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <img
          src={selectedAgent?.avatar}
          alt={selectedAgent?.name}
          className="w-12 h-12 rounded-full object-cover"
        />
        <div>
          <h2 className="text-xl font-bold text-white">{selectedAgent?.name}</h2>
          <div className="flex items-center gap-2 text-gray-400">
            {getAgentIcon(selectedAgent?.type)}
            <span className="capitalize">{selectedAgent?.type} Agent</span>
          </div>
        </div>
      </div>

      {/* Chat Messages - Update the message containers */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {selectedAgent?.messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] p-4 rounded-xl ${
                message.sender === 'user'
                  ? 'bg-blue-500/90 backdrop-blur-sm text-white'
                  : 'bg-gray-800/90 backdrop-blur-sm text-white'
              }`}
            >
              <p>{message.content}</p>
              <span className="text-xs opacity-70 mt-2 block">
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 text-white p-4 rounded-xl">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input - Update the background */}
      <div className="sticky bottom-0 left-0 right-0 p-4 bg-gray-800/50 backdrop-blur-sm border-t border-gray-700 shadow-lg">
        <div className="flex gap-4 max-w-screen-2xl mx-auto">
          <input
            type="text"
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={`Ask ${selectedAgent?.name} anything...`}
            className="flex-1 bg-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
            autoFocus
          />
          <button
            onClick={handleSendMessage}
            disabled={!currentMessage.trim()}
            className={`${
              currentMessage.trim() 
                ? 'bg-blue-500 hover:bg-blue-600' 
                : 'bg-blue-500/50 cursor-not-allowed'
            } text-white rounded-lg px-6 py-3 flex items-center gap-2 transition-colors`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  if (chatMode && selectedAgent) {
    return <ChatInterface />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full bg-white/10 backdrop-blur-md text-white shadow-lg transition-transform transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } w-64 z-50`} // Ensure the sidebar is in the front
      >
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">Tips & Prompts</h2>
          <ul className="space-y-4 text-sm">
            <li>
              <strong>Habit Tracker:</strong> Type "Create a habit tracker" to generate an agent that helps you track habits.
            </li>
            <li>
              <strong>Physics Notes:</strong> Type "Generate physics notes" to create an agent for physics-related notes.
            </li>
            <li>
              <strong>Custom Notion:</strong> Type "Create me an agent to manage my Notion" for a Notion integration.
            </li>
            <li>
              <strong>Search:</strong> Type "Search for [topic]" to create a search assistant.
            </li>
            <li>
              <strong>Desktop App:</strong> Type "Code me an app for [purpose]" to generate a desktop app assistant.
            </li>
          </ul>
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`fixed top-4 ${
          isSidebarOpen ? 'left-60' : 'left-4'
        } bg-white/20 backdrop-blur-md hover:bg-white/30 text-white rounded-full p-3 z-50 transition-all`}
        style={{
          boxShadow: '4px 4px 10px rgba(0, 0, 0, 0.2), -4px -4px 10px rgba(255, 255, 255, 0.1)',
        }}
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Main Container */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col h-screen">
          {/* Header */}
          <header className="mb-8">
            <div className="flex justify-end items-center gap-3">
              <Sparkles className="w-10 h-10 text-blue-400" />
              <h1 className="text-4xl font-bold">AI Agent Generator</h1>
            </div>
            <p className="text-gray-400 mt-2 text-right">
              Create custom AI agents for your specific needs
            </p>
          </header>

          {/* Input Area - Elevated */}
          <div className="sticky top-0 z-20 bg-gradient-to-br from-gray-900 to-gray-800 py-4 mb-12"> {/* Increased margin-bottom */}
            <div 
              className="bg-white/10 backdrop-blur-md rounded-full border border-gray-700/50 max-w-3xl mx-auto flex items-center px-6 py-4"
              style={{
                boxShadow: '0px 12px 30px rgba(0, 0, 0, 0.25)', // Elevated shadow
              }}
            >
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your AI agent..."
                className="flex-1 bg-transparent px-4 py-3 focus:outline-none text-white placeholder-gray-400"
                onKeyPress={(e) => e.key === 'Enter' && handleGenerateAgent()}
              />
              <button
                onClick={handleGenerateAgent}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-full w-14 h-14 flex items-center justify-center transition-all"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m-7 7l7-7 7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Agents Grid */}
          <div className="flex-1 overflow-x-hidden mb-8 relative z-0"> {/* Push agents to the background */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-h-[200px]">
              {agents.length > 0 ? (
                agents.map((agent) => (
                  <div
                    key={agent.id}
                    onClick={() => {
                      setSelectedAgent(agent);
                      handleOpenChat();
                    }}
                    className="bg-gray-800 rounded-full p-3 cursor-pointer transform transition-all hover:scale-105 border border-gray-600"
                    style={{
                      height: '120px', // Shorter height
                      boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)', // Light shadow
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={agent.avatar}
                        alt={agent.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <h3 className="text-base font-semibold text-white">{agent.name}</h3> {/* Increased font size */}
                        <div className="flex items-center gap-2 text-gray-300 text-sm">
                          {getAgentIcon(agent.type)}
                          <span className="capitalize">{agent.type.replace('-', ' ')} Agent</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center text-gray-400 py-8">
                  No agents created yet. Type a description above to create one!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;