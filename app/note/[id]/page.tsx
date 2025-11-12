'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Share2, Save, Trash2, Users, Mail, Sparkles, X, CheckCircle2, Target, ListTodo, MessageSquare, Hash } from 'lucide-react';
import { getNote, updateNote, deleteNote, subscribeToNote } from '@/lib/notes';
import RichTextEditor from '@/components/RichTextEditor';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export default function NotePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [collaborativeMode, setCollaborativeMode] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [showAiSidebar, setShowAiSidebar] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResults, setAiResults] = useState<any>(null);
  const [aiError, setAiError] = useState('');
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const editorRef = useRef<any>(null);
  const isUpdatingFromSync = useRef(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function loadNote() {
      const note = await getNote(params.id);
      if (note) {
        setTitle(note.title);
        setContent(note.content);
      }
      setIsLoading(false);
    }

    loadNote();
  }, [params.id]);

  useEffect(() => {
    if (!collaborativeMode) return;

    const channel = subscribeToNote(params.id, (updatedNote) => {
      isUpdatingFromSync.current = true;
      setTitle(updatedNote.title);
      setContent(updatedNote.content);
      setTimeout(() => {
        isUpdatingFromSync.current = false;
      }, 100);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [params.id, collaborativeMode]);

  const saveNote = useCallback(
    async (newTitle: string, newContent: string) => {
      setIsSaving(true);
      await updateNote(params.id, {
        title: newTitle,
        content: newContent,
      });
      setTimeout(() => setIsSaving(false), 800);
    },
    [params.id]
  );

  useEffect(() => {
    if (isLoading || isUpdatingFromSync.current) return;

    const timer = setTimeout(() => {
      saveNote(title, content);
    }, 1000);

    return () => clearTimeout(timer);
  }, [title, content, isLoading, saveNote]);

  const handleDelete = async () => {
    setIsDeleting(true);
    const success = await deleteNote(params.id);
    if (success) {
      router.push('/');
    } else {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/note/${params.id}`;
    setShareLink(url);
    setShowShareModal(true);
    setInviteEmail('');
    setInviteSuccess(false);
    setInviteError('');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      setInviteError('Please enter a valid email address');
      return;
    }

    setIsSendingInvite(true);
    setInviteError('');
    setInviteSuccess(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-note-invitation`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          noteId: params.id,
          invitedEmail: inviteEmail,
          noteTitle: title,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to send invitation');
      }

      if (result.needsEmailSetup || !result.emailSent) {
        const message = result.emailError
          ? `Email couldn't be sent (${result.emailError}). Copy the link below and share it directly with ${inviteEmail}`
          : 'Email service not configured. Copy the link below and share it directly.';
        setInviteError(message);
        setTimeout(() => setInviteError(''), 10000);
      } else {
        setInviteSuccess(true);
        setTimeout(() => setInviteSuccess(false), 5000);
      }

      setInviteEmail('');
    } catch (err: any) {
      console.error('Failed to send invite:', err);
      setInviteError(err.message || 'Failed to send invitation');
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleAnalyzeNote = async () => {
    setIsAnalyzing(true);
    setAiError('');
    setAiResults(null);

    try {
      const plainText = editorRef.current?.editor?.getText() || content;

      if (!plainText || plainText.trim().length < 10) {
        throw new Error('Please add some content to your note before analyzing.');
      }

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analyze-notes`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          noteContent: plainText,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to analyze notes. Please try again.');
      }

      setAiResults(data.results);
    } catch (err: any) {
      console.error('AI Analysis error:', err);
      setAiError(err.message || "Couldn't analyze right now. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleInsertIntoNote = () => {
    if (!aiResults || !editorRef.current?.editor) return;

    const formatted = `\n\n---\n\n## 📋 AI Meeting Summary\n\n### Summary\n${aiResults.summary}\n\n### Key Decisions\n${aiResults.decisions.map((d: string) => `- ✓ ${d}`).join('\n')}\n\n### Action Items\n${aiResults.actionItems.map((a: string) => `- [ ] ${a}`).join('\n')}\n\n### Next Steps\n${aiResults.nextSteps.map((s: string) => `- ${s}`).join('\n')}\n\n### Topics Discussed\n${aiResults.topics.join(' • ')}\n`;

    const editor = editorRef.current.editor;
    editor.commands.focus('end');
    editor.commands.insertContent(formatted);

    setShowAiSidebar(false);
  };

  const handleCopyToClipboard = async () => {
    if (!aiResults) return;

    const formatted = `AI Meeting Summary\n\nSummary:\n${aiResults.summary}\n\nKey Decisions:\n${aiResults.decisions.map((d: string) => `- ${d}`).join('\n')}\n\nAction Items:\n${aiResults.actionItems.map((a: string) => `- ${a}`).join('\n')}\n\nNext Steps:\n${aiResults.nextSteps.map((s: string) => `- ${s}`).join('\n')}\n\nTopics Discussed:\n${aiResults.topics.join(', ')}`;

    try {
      await navigator.clipboard.writeText(formatted);
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const mockUsers = [
    { initials: 'JD', color: 'bg-blue-500' },
    { initials: 'SM', color: 'bg-purple-500' },
    { initials: 'AK', color: 'bg-green-500' },
  ];

  if (authLoading || isLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">Back to Dashboard</span>
            </Link>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setCollaborativeMode(!collaborativeMode)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  collaborativeMode
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-300'
                }`}
                title={collaborativeMode ? 'Collaborative mode enabled' : 'Collaborative mode disabled'}
              >
                <Users size={18} />
                <span className="text-sm font-medium">
                  {collaborativeMode ? 'Live' : 'Solo'}
                </span>
              </button>

              {collaborativeMode && (
                <div className="flex -space-x-2">
                  {mockUsers.map((user, index) => (
                    <div
                      key={index}
                      className={`${user.color} w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium border-2 border-white shadow-sm`}
                    >
                      {user.initials}
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowAiSidebar(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-sm hover:shadow-md"
              >
                <Sparkles size={18} />
                <span className="font-medium">AI Assistant</span>
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm hover:shadow-md"
              >
                <Share2 size={18} />
                <span className="font-medium">Share</span>
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-sm hover:shadow-md"
                title="Delete note"
              >
                <Trash2 size={18} />
              </button>

              {isSaving && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Save size={16} className="animate-pulse" />
                  <span>Saving...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled Note"
            className="w-full text-4xl font-bold text-gray-900 bg-transparent border-none outline-none focus:ring-0 placeholder-gray-400 px-2"
          />
        </div>
        <RichTextEditor
          ref={editorRef}
          content={content}
          onUpdate={setContent}
          placeholder="Start typing your meeting notes..."
        />
      </main>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Delete Note
                </h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete this note? This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Share2 size={24} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Share Note
                </h3>
                <p className="text-gray-600 mb-4">
                  Share this note with others via link or email
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Share Link
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={shareLink}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                      />
                      <button
                        onClick={handleCopyLink}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">Or invite by email</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => {
                            setInviteEmail(e.target.value);
                            setInviteError('');
                          }}
                          placeholder="colleague@example.com"
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          disabled={isSendingInvite}
                        />
                      </div>
                      <button
                        onClick={handleSendInvite}
                        disabled={isSendingInvite || !inviteEmail}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-2"
                      >
                        {isSendingInvite ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Sending...
                          </>
                        ) : (
                          'Send Invite'
                        )}
                      </button>
                    </div>

                    {inviteSuccess && (
                      <div className="mt-2 p-2 bg-green-100 text-green-700 rounded-lg text-sm">
                        Invitation sent successfully!
                      </div>
                    )}

                    {inviteError && (
                      <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg text-sm">
                        <p className="font-medium mb-1">⚠️ {inviteError}</p>
                        <p className="text-xs text-yellow-700 mt-2">
                          The invitation was saved, but the email service needs to be configured with a valid Resend API key.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 justify-end mt-6">
                  <button
                    onClick={() => {
                      setShowShareModal(false);
                      setCopied(false);
                      setInviteEmail('');
                      setInviteSuccess(false);
                      setInviteError('');
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAiSidebar && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowAiSidebar(false)}
          />
          <div className="fixed top-0 right-0 h-full w-[400px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">AI Meeting Assistant</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    I'll extract action items, key decisions, and next steps from your notes
                  </p>
                </div>
                <button
                  onClick={() => setShowAiSidebar(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {!aiResults && !isAnalyzing && !aiError && (
                <button
                  onClick={handleAnalyzeNote}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg font-semibold text-lg flex items-center justify-center gap-2"
                >
                  <Sparkles size={20} />
                  Analyze Note
                </button>
              )}

              {isAnalyzing && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-gray-600 font-medium">Analyzing your notes...</p>
                </div>
              )}

              {aiError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                  <p className="font-medium mb-2">Analysis Failed</p>
                  <p className="text-sm">{aiError}</p>
                </div>
              )}

              {aiResults && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare size={18} className="text-blue-600" />
                      <h3 className="font-semibold text-gray-900">Summary</h3>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">{aiResults.summary}</p>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 size={18} className="text-green-600" />
                      <h3 className="font-semibold text-gray-900">Key Decisions</h3>
                    </div>
                    <ul className="space-y-2">
                      {aiResults.decisions.map((decision: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-green-600 mt-0.5">✓</span>
                          <span>{decision}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <ListTodo size={18} className="text-orange-600" />
                      <h3 className="font-semibold text-gray-900">Action Items</h3>
                    </div>
                    <ul className="space-y-2">
                      {aiResults.actionItems.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                          <input type="checkbox" className="mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Target size={18} className="text-blue-600" />
                      <h3 className="font-semibold text-gray-900">Next Steps</h3>
                    </div>
                    <ul className="space-y-2">
                      {aiResults.nextSteps.map((step: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-blue-600 mt-0.5">→</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Hash size={18} className="text-purple-600" />
                      <h3 className="font-semibold text-gray-900">Topics Discussed</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {aiResults.topics.map((topic: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {aiResults && (
              <div className="border-t border-gray-200 p-6 space-y-3 bg-gray-50">
                <button
                  onClick={handleInsertIntoNote}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg font-semibold"
                >
                  Insert into Note
                </button>
                <button
                  onClick={handleCopyToClipboard}
                  className="w-full py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-semibold"
                >
                  Copy to Clipboard
                </button>
                <button
                  onClick={() => {
                    setAiResults(null);
                    setAiError('');
                  }}
                  className="w-full py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {showCopiedToast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <CheckCircle2 size={20} />
          <span>Copied!</span>
        </div>
      )}
    </div>
  );
}
