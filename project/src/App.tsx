// @ts-nocheck

import { useState, useEffect, useRef } from 'react';
import { Bot, NotebookPen, FileText, Plus, Send, X, Maximize2, ArrowLeft, Sparkles, Search, Menu } from 'lucide-react';

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
  notionId?: string;
  pageId?: string;
}

function App() {
  const [prompt, setPrompt] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [chatMode, setChatMode] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
      avatar: agentType, // Just store the agent type here instead of an image URL
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
        return <Sparkles className="w-5 h-5" />;
      case AgentType.PHYSICS_NOTES:
        return <FileText className="w-5 h-5" />;
      case AgentType.DESKTOP_AGENT:
        return <Bot className="w-5 h-5" />;
      case AgentType.CUSTOM_NOTION:
        return <NotebookPen className="w-5 h-5" />;
      case AgentType.SEARCH:
        return <Search className="w-5 h-5" />;
    }
  };

  const getAgentGradient = (type: AgentType) => {
    switch (type) {
      case AgentType.HABIT_TRACKER:
        return 'from-purple-500 to-indigo-600';
      case AgentType.PHYSICS_NOTES:
        return 'from-blue-500 to-cyan-600';
      case AgentType.DESKTOP_AGENT:
        return 'from-teal-500 to-emerald-600';
      case AgentType.CUSTOM_NOTION:
        return 'from-amber-500 to-orange-600';
      case AgentType.SEARCH:
        return 'from-rose-500 to-pink-600';
    }
  };

  const ChatInterface = () => (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-950 to-gray-900 overflow-hidden">
      {/* Chat Header */}
      <div className="bg-gray-900 backdrop-blur-lg p-4 flex items-center gap-4 border-b border-gray-800 shadow-md">
        <button 
          onClick={() => setChatMode(false)}
          className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="relative">
          <div className={`absolute inset-0 bg-gradient-to-br ${getAgentGradient(selectedAgent?.type)} rounded-full opacity-20 blur-sm`}></div>
          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAgentGradient(selectedAgent?.type)} flex items-center justify-center relative z-10 border-2 border-white/20`}>
            {getAgentIcon(selectedAgent?.type)}
          </div>
        </div>
        
        <div>
          <h2 className="text-xl font-bold text-white">{selectedAgent?.name}</h2>
          <div className="flex items-center gap-2 text-gray-400">
            {getAgentIcon(selectedAgent?.type)}
            <span className="capitalize text-sm">{selectedAgent?.type.replace('-', ' ')} Agent</span>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-auto p-6 space-y-6 bg-[url('/subtle-pattern.png')] bg-repeat bg-opacity-5">
        {selectedAgent?.messages.map((message, index) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.sender === 'agent' && (
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mr-2 mt-1">
                <div className={`w-full h-full bg-gradient-to-br ${getAgentGradient(selectedAgent.type)} flex items-center justify-center`}>
                  {getAgentIcon(selectedAgent.type)}
                </div>
              </div>
            )}
            
            <div
              className={`max-w-[70%] p-4 rounded-2xl shadow-lg ${
                message.sender === 'user'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white'
                  : 'bg-white/10 backdrop-blur-md text-white border border-white/10'
              } ${index === 0 ? '' : 'animate-fadeIn'}`}
              style={{
                animationDelay: `${index * 0.1}s`
              }}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <span className="text-xs opacity-60 mt-2 block">
                {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
            
            {message.sender === 'user' && (
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 ml-2 mt-1">
                <span className="text-white text-sm font-semibold">
                  {/* First letter of "You" */}
                  Y
                </span>
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mr-2">
              <div className={`w-full h-full bg-gradient-to-br ${getAgentGradient(selectedAgent?.type)} flex items-center justify-center`}>
                {getAgentIcon(selectedAgent?.type)}
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md text-white p-4 rounded-2xl shadow-lg border border-white/10">
              <div className="flex space-x-2 items-center h-6">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="p-4 bg-gray-900 border-t border-gray-800 shadow-lg">
        <div className="flex gap-3 max-w-screen-xl mx-auto relative">
          <input
            type="text"
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={`Ask ${selectedAgent?.name} anything...`}
            className="flex-1 bg-gray-800 rounded-full px-6 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400 border border-gray-700"
            autoFocus
          />
          <button
            onClick={handleSendMessage}
            disabled={!currentMessage.trim()}
            className={`${
              currentMessage.trim() 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700' 
                : 'bg-gray-700 cursor-not-allowed'
            } text-white rounded-full w-14 h-14 flex items-center justify-center transition-all shadow-lg`}
          >
            <Send className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );

  if (chatMode && selectedAgent) {
    return <ChatInterface />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-900 text-white font-sans">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5"></div>
        <div className="absolute top-0 -left-40 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute top-0 -right-40 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-20 w-96 h-96 bg-teal-500 rounded-full filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full bg-gray-900 text-white shadow-2xl transition-transform transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } w-80 z-50 border-r border-gray-800`}
      >
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Agent Creation Guide</h2>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-6 flex-1 overflow-auto">
            {[
              { 
                type: AgentType.HABIT_TRACKER, 
                title: "Habit Tracker",
                desc: "Create a habit tracker to monitor your daily activities and progress.",
                prompt: "Create a habit tracker"
              },
              { 
                type: AgentType.PHYSICS_NOTES, 
                title: "Physics Notes",
                desc: "Generate physics notes to help with your studies or research.",
                prompt: "Generate physics notes"
              },
              { 
                type: AgentType.CUSTOM_NOTION, 
                title: "Custom Notion",
                desc: "Create an agent to manage your Notion workspaces and databases.",
                prompt: "Create me an agent to manage my Notion"
              },
              { 
                type: AgentType.SEARCH, 
                title: "Search Assistant",
                desc: "Create a search assistant to find information on any topic.",
                prompt: "Search for [topic]"
              },
              { 
                type: AgentType.DESKTOP_AGENT, 
                title: "Desktop App",
                desc: "Get help building desktop applications for your specific needs.",
                prompt: "Code me an app for [purpose]"
              }
            ].map((agent) => (
              <div 
                key={agent.type}
                className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-blue-500 transition-all cursor-pointer"
                onClick={() => {
                  setPrompt(agent.prompt);
                  setIsSidebarOpen(false);
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAgentGradient(agent.type)} flex items-center justify-center`}>
                    {getAgentIcon(agent.type)}
                  </div>
                  <h3 className="font-semibold">{agent.title}</h3>
                </div>
                <p className="text-sm text-gray-400">{agent.desc}</p>
                <div className="mt-3 text-xs text-gray-500 bg-gray-900 p-2 rounded">
                  <span className="text-blue-400">Try:</span> {agent.prompt}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 border-t border-gray-800 pt-4">
            <p className="text-sm text-gray-400">
              Need help? Check out our documentation for more information on creating and using AI agents.
            </p>
          </div>
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`fixed top-6 ${
          isSidebarOpen ? 'left-72' : 'left-6'
        } bg-gray-800 hover:bg-gray-700 text-white rounded-full p-3 z-50 transition-all shadow-lg border border-gray-700`}
      >
        {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Main Container */}
      <div className="container mx-auto px-6 py-8 relative z-10 max-w-7xl">
        <div className="flex flex-col min-h-screen">
          {/* Header */}
          <header className="mb-16 mt-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center shadow-lg mb-6">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500 mb-4">
                AI Agent Generator
              </h1>
              <p className="text-gray-400 max-w-2xl text-lg">
                Create powerful, custom AI agents tailored to your specific needs
              </p>
            </div>
          </header>

          {/* Input Area */}
          <div className="sticky top-0 z-20 py-6 bg-gradient-to-b from-gray-950 via-gray-950 to-transparent">
            <div className="relative max-w-3xl mx-auto">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full opacity-75 blur-sm"></div>
              <div 
                className="relative bg-gray-900 rounded-full border border-gray-800 flex items-center px-6 py-2 shadow-2xl"
              >
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your AI agent..."
                  className="flex-1 bg-transparent px-4 py-4 focus:outline-none text-white placeholder-gray-400 text-lg"
                  onKeyPress={(e) => e.key === 'Enter' && handleGenerateAgent()}
                />
                <button
                  onClick={handleGenerateAgent}
                  disabled={!prompt.trim()}
                  className={`${
                    prompt.trim() 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700' 
                      : 'bg-gray-700 cursor-not-allowed'
                  } text-white rounded-full w-14 h-14 flex items-center justify-center transition-all shadow-lg`}
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Agents Grid */}
          <div className="flex-1 mt-8 pb-20">
            {agents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    onClick={() => {
                      setSelectedAgent(agent);
                      handleOpenChat();
                    }}
                    className="group relative bg-gray-800 rounded-xl overflow-hidden cursor-pointer transform transition-all hover:scale-105 shadow-xl border border-gray-700 hover:border-blue-500"
                  >
                    {/* Background gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${getAgentGradient(agent.type)} opacity-20`}></div>
                    
                    {/* Agent content */}
                    <div className="p-5 relative z-10">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className={`absolute inset-0 bg-gradient-to-br ${getAgentGradient(agent.type)} rounded-full opacity-50 blur-sm group-hover:opacity-80 transition-opacity`}></div>
                          <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getAgentGradient(agent.type)} flex items-center justify-center relative z-10 border-2 border-white/10`}>
                            {getAgentIcon(agent.type)}
                          </div>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">{agent.name}</h3>
                          <div className="flex items-center gap-2 text-gray-300 mt-1">
                            {getAgentIcon(agent.type)}
                            <span className="capitalize text-sm">{agent.type.replace('-', ' ')} Agent</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 text-sm text-gray-400 line-clamp-2">
                        {agent.description}
                      </div>
                      
                      <div className="mt-4 flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          {agent.messages.length} message{agent.messages.length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-blue-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                          Open chat <ArrowLeft className="w-4 h-4 transform rotate-180" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center flex flex-col items-center justify-center py-20">
                <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-6 opacity-50">
                  <Bot className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-400 mb-3">No agents created yet</h3>
                <p className="text-gray-500 max-w-md">
                  Describe your AI agent above or click the menu button to see examples
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <footer className="py-6 text-center text-gray-500 text-sm border-t border-gray-800 mt-auto">
            <p>© 2025 AI Agent Generator | Powered by Advanced AI Technology</p>
          </footer>
        </div>
      </div>

      {/* Style Definitions for Animations */}
      <style jsx>{`
        @keyframes blobAnimation {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-blob {
          animation: blobAnimation 7s infinite;
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;  
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

export default App;