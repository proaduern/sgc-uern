'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  ExternalLink,
  BookOpen,
  ChevronDown,
  Minimize2,
  Maximize2
} from 'lucide-react';
import Link from 'next/link';
import { ChatMessage } from '@/types/chat';

const PERGUNTAS_SUGERIDAS = [
  'Como funciona a repactuação por CCT sem interregno de 1 ano?',
  'Como emitir o ofício de conta vinculada e debitar por funcionário?',
  'Quais são as regras e faixas de glosa do IMR?',
  'Qual o prazo de defesa prévia em termo de notificação?',
  'Quais contratos estão cadastrados no sistema?'
];

export default function ChatDrawer() {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<ChatMessage[]>([
    {
      id: 'msg-init',
      sender: 'bot',
      text: `Olá! Sou o **Assistente de Normas & Contratos do SGC-UERN**.\n\nVocê pode me fazer perguntas sobre a **IN nº 01/2026**, **Lei 14.133/21**, regras de **repactuação sem interregno**, **conta vinculada**, **IMR**, ou consultar detalhes de qualquer **contrato administrativo** cadastrado!`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      referencias: ['Instrução Normativa nº 01/2026 - PROAD/UERN'],
    }
  ]);
  const [inputTexto, setInputTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (aberto) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensagens, aberto]);

  const enviarMensagem = async (texto: string) => {
    if (!texto.trim() || enviando) return;

    const msgUsuario: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: texto,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMensagens((prev) => [...prev, msgUsuario]);
    setInputTexto('');
    setEnviando(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem: texto }),
      });

      const data = await res.json();
      if (res.ok && data.resposta) {
        setMensagens((prev) => [...prev, data.resposta]);
      } else {
        setMensagens((prev) => [
          ...prev,
          {
            id: 'err-' + Date.now(),
            sender: 'bot',
            text: 'Desculpe, ocorreu um erro ao consultar as normas. Por favor, tente novamente.',
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          }
        ]);
      }
    } catch (e: any) {
      setMensagens((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          sender: 'bot',
          text: 'Erro de conexão com o servidor do assistente.',
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      {/* Botão Flutuante Discreto e Elegante */}
      {!aberto && (
        <button
          onClick={() => setAberto(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center space-x-2.5 px-4 py-3 bg-[#003366] hover:bg-[#002244] text-white rounded-full shadow-2xl transition-all hover:scale-105 cursor-pointer border border-blue-400/30 group"
          title="Abrir Assistente de Normas e Contratos"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#003366]"></span>
          </div>
          <span className="text-xs font-bold tracking-wide">Assistente IA UERN</span>
        </button>
      )}

      {/* Janela do Chatbot */}
      {aberto && (
        <div className="fixed bottom-6 right-6 z-50 w-[92vw] sm:w-[460px] h-[600px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
          {/* Cabeçalho */}
          <div className="p-4 bg-gradient-to-r from-[#003366] to-[#004b93] text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                <Bot className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="font-bold text-sm tracking-tight">Assistente SGC UERN</h3>
                  <span className="px-1.5 py-0.2 bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 text-[9px] rounded font-mono font-bold">
                    IA NORMAS
                  </span>
                </div>
                <p className="text-[11px] text-blue-100/80">
                  Dúvidas sobre contratos, repactuação, IMR e IN 01/2026
                </p>
              </div>
            </div>

            <button
              onClick={() => setAberto(false)}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Área de Mensagens */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/60 text-xs">
            {mensagens.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center space-x-1 mb-1">
                  {m.sender === 'bot' ? (
                    <span className="text-[10px] font-bold text-blue-800 flex items-center space-x-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Assistente UERN</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-500">Você</span>
                  )}
                  <span className="text-[9px] text-slate-400">{m.timestamp}</span>
                </div>

                <div
                  className={`p-3.5 rounded-2xl max-w-[92%] leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-[#003366] text-white rounded-br-none shadow-sm'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'
                  }`}
                >
                  <div className="whitespace-pre-line space-y-1">
                    {m.text}
                  </div>

                  {/* Referências Legais */}
                  {m.referencias && m.referencias.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        Fundamentação Jurídica:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {m.referencias.map((ref, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center space-x-1 bg-blue-50 text-blue-800 border border-blue-200/60 px-1.5 py-0.5 rounded text-[10px] font-medium"
                          >
                            <BookOpen className="w-2.5 h-2.5 text-blue-600" />
                            <span>{ref}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Links Úteis de Navegação no Sistema */}
                  {m.linksUteis && m.linksUteis.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.linksUteis.map((lk, i) => (
                        <Link
                          key={i}
                          href={lk.url}
                          className="inline-flex items-center space-x-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline bg-slate-50 px-2 py-1 rounded-md border border-slate-200 transition-colors"
                        >
                          <span>{lk.label}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {enviando && (
              <div className="flex items-center space-x-2 text-slate-500 text-xs italic p-2 bg-white/70 rounded-xl border border-slate-200 w-fit">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                <span>Consultando normas e base de dados SGC...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chips de Perguntas Rápidas */}
          <div className="px-3 py-2 bg-slate-100/90 border-t border-slate-200 overflow-x-auto flex gap-1.5 scrollbar-none">
            {PERGUNTAS_SUGERIDAS.map((pergunta, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => enviarMensagem(pergunta)}
                className="whitespace-nowrap px-2.5 py-1 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-[10px] font-semibold rounded-full border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer flex-shrink-0 shadow-2xs"
              >
                {pergunta}
              </button>
            ))}
          </div>

          {/* Campo de Entrada de Mensagem */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviarMensagem(inputTexto);
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2"
          >
            <input
              type="text"
              value={inputTexto}
              onChange={(e) => setInputTexto(e.target.value)}
              placeholder="Pergunte sobre um contrato ou norma da UERN..."
              className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 text-slate-800"
            />
            <button
              type="submit"
              disabled={!inputTexto.trim() || enviando}
              className="p-2.5 bg-[#003366] hover:bg-[#002244] text-white rounded-xl shadow transition-colors disabled:opacity-50 cursor-pointer flex-shrink-0"
              title="Enviar pergunta"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
