import React, { useState } from 'react';
import { Bot, NotebookPen, FileText, Plus, Send, X, Maximize2, ArrowLeft, Sparkles } from 'lucide-react';

enum AgentType {
  HABIT_TRACKER = 'habit-tracker',
  PHYSICS_NOTES = 'physics-notes',
  DESKTOP_AGENT = 'desktop-agent',
  CUSTOM_NOTION = 'custom-notion'
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
}

function App() {
  const [prompt, setPrompt] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [chatMode, setChatMode] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');

  const handleGenerateAgent = () => {
    if (!prompt.trim()) return;

    let agentType: AgentType;
    let agentName: string;

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
    } else {
      return;
    }

    const newAgent: Agent = {
      id: Date.now().toString(),
      name: agentName,
      type: agentType,
      avatar: `https://source.unsplash.com/random/200x200?${agentType},${Date.now()}`,
      description: prompt,
      messages: []
    };

    setAgents([...agents, newAgent]);
    setPrompt('');
  };

  const handleSendMessage = () => {
    if (!currentMessage.trim() || !selectedAgent) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: currentMessage,
      sender: 'user',
      timestamp: new Date()
    };

    let responseContent = '';
    switch (selectedAgent.type) {
      case AgentType.HABIT_TRACKER:
        responseContent = "I've logged your habit. Keep up the good work! Would you like to see your progress or set a new habit?";
        break;
      case AgentType.PHYSICS_NOTES:
        responseContent = "I've added this to your physics notes. Would you like me to explain this concept further or provide related examples?";
        break;
      case AgentType.DESKTOP_AGENT:
        responseContent = "I can help you code that app. Let's break down the requirements and start with the basic structure.";
        break;
      case AgentType.CUSTOM_NOTION:
        responseContent = "I've updated your Notion workspace with this information. Would you like me to organize it or create a new page?";
        break;
    }

    const agentResponse: Message = {
      id: (Date.now() + 1).toString(),
      content: responseContent,
      sender: 'agent',
      timestamp: new Date()
    };

    const updatedAgent = {
      ...selectedAgent,
      messages: [...selectedAgent.messages, newMessage, agentResponse]
    };

    setAgents(agents.map(agent => 
      agent.id === selectedAgent.id ? updatedAgent : agent
    ));
    setSelectedAgent(updatedAgent);
    setCurrentMessage('');
  };

  const handleOpenChat = () => {
    setChatMode(true);
    setCurrentMessage(''); // Clear the input when opening chat
  };

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
    }
  };

  const ChatInterface = () => (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Chat Header */}
      <div className="bg-gray-800 p-4 flex items-center gap-4 border-b border-gray-700">
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

      {/* Chat Messages */}
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
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-800 text-white'
              }`}
            >
              <p>{message.content}</p>
              <span className="text-xs opacity-70 mt-2 block">
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Chat Input */}
      <div className="p-4 bg-gray-800 border-t border-gray-700">
        <div className="flex gap-4">
          <input
            type="text"
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} // Changed from onKeyPress to onKeyDown
            placeholder={`Ask ${selectedAgent?.name} anything...`}
            className="flex-1 bg-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
            autoFocus // Add autofocus to improve UX
          />
          <button
            onClick={handleSendMessage}
            disabled={!currentMessage.trim()} // Disable if empty
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
      {/* Main Container */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col h-screen">
          {/* Header */}
          <header className="mb-8">
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Bot className="w-10 h-10 text-blue-400" />
              AI Agent Generator
            </h1>
            <p className="text-gray-400 mt-2">Create custom AI agents for your specific needs</p>
          </header>

          {/* Agents Grid */}
          <div className="flex-1 overflow-auto mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent)}
                  className="bg-gray-800 rounded-xl p-6 cursor-pointer transform transition-all hover:scale-105 hover:shadow-xl border border-gray-700"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={agent.avatar}
                      alt={agent.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="text-xl font-semibold">{agent.name}</h3>
                      <div className="flex items-center gap-2 text-gray-400">
                        {getAgentIcon(agent.type)}
                        <span className="capitalize">{agent.type} Agent</span>
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-gray-400 line-clamp-2">{agent.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Input Area */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex gap-4">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your AI agent..."
                className="flex-1 bg-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                onKeyPress={(e) => e.key === 'Enter' && handleGenerateAgent()}
              />
              <button
                onClick={handleGenerateAgent}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-6 py-3 flex items-center gap-2 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Generate
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Dialog */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <img
                    src={selectedAgent.avatar}
                    alt={selectedAgent.name}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                  <div>
                    <h2 className="text-2xl font-bold">{selectedAgent.name}</h2>
                    <div className="flex items-center gap-2 text-gray-400">
                      {getAgentIcon(selectedAgent.type)}
                      <span className="capitalize">{selectedAgent.type} Agent</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="bg-gray-900 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-semibold mb-2">Agent Description</h3>
                <p className="text-gray-400">{selectedAgent.description}</p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg px-6 py-3 flex items-center justify-center gap-2 transition-colors"
                >
                  <X className="w-5 h-5" />
                  Close
                </button>
                <button
                  onClick={handleOpenChat}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-6 py-3 flex items-center justify-center gap-2 transition-colors"
                >
                  <Maximize2 className="w-5 h-5" />
                  Open Agent
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;