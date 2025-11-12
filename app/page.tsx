'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, FileText, Pencil, Trash2, LogOut } from 'lucide-react';
import { getNotes, createNote, deleteNote, type Note } from '@/lib/notes';
import { useAuth } from '@/lib/auth-context';
import AuthModal from '@/components/AuthModal';

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const { user, isLoading: authLoading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    async function loadNotes() {
      if (!authLoading && user) {
        const data = await getNotes();
        setNotes(data);
      }
      setIsLoading(false);
    }

    loadNotes();
  }, [user, authLoading]);

  const handleCreateNote = async () => {
    if (!user) {
      setAuthModalMode('signup');
      setShowAuthModal(true);
      return;
    }
    setIsCreating(true);
    const note = await createNote();
    if (note) {
      router.push(`/note/${note.id}`);
    }
    setIsCreating(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setNotes([]);
  };

  const handleDeleteClick = (e: React.MouseEvent, note: Note) => {
    e.preventDefault();
    e.stopPropagation();
    setNoteToDelete(note);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!noteToDelete) return;

    setDeletingNoteId(noteToDelete.id);
    const success = await deleteNote(noteToDelete.id);

    if (success) {
      setNotes(notes.filter(n => n.id !== noteToDelete.id));
    }

    setDeletingNoteId(null);
    setShowDeleteConfirm(false);
    setNoteToDelete(null);
  };

  const handleEditClick = (e: React.MouseEvent, noteId: string) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/note/${noteId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
              NoteSync
            </h1>
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <div className="text-sm text-gray-600">
                    {user.email}
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <LogOut size={18} />
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setAuthModalMode('signin');
                      setShowAuthModal(true);
                    }}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      setAuthModalMode('signup');
                      setShowAuthModal(true);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm font-medium"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-4">
            Collaborative notes with AI superpowers
          </h2>
          <p className="text-xl text-gray-600 mb-12">
            Create, share, and enhance your notes with intelligent assistance
          </p>

          <button
            onClick={handleCreateNote}
            disabled={isCreating}
            className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <Plus size={24} />
            {isCreating ? 'Creating...' : 'New Note'}
          </button>
        </div>

        <div className="mt-16">
          {user && (
            <h3 className="text-2xl font-semibold text-gray-900 mb-6">
              Recent Notes
            </h3>
          )}

          {!user ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-6">Sign in to view and create your notes</p>
              <button
                onClick={() => {
                  setAuthModalMode('signin');
                  setShowAuthModal(true);
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md font-medium"
              >
                Get Started
              </button>
            </div>
          ) : isLoading ? (
            <div className="text-center text-gray-500 py-12">Loading notes...</div>
          ) : notes.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 flex flex-col items-center justify-center min-h-[200px] hover:border-blue-400 transition-colors">
                <FileText className="w-12 h-12 text-gray-400 mb-3" />
                <p className="text-gray-500 text-center">
                  No notes yet. Create your first note to get started!
                </p>
              </div>
              <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 flex flex-col items-center justify-center min-h-[200px] hover:border-blue-400 transition-colors">
                <FileText className="w-12 h-12 text-gray-400 mb-3" />
                <p className="text-gray-500 text-center">
                  Your notes will appear here
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all hover:border-blue-400 group relative"
                >
                  <Link href={`/note/${note.id}`} className="block">
                    <div className="flex items-start gap-3 mb-3">
                      <FileText className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0 mt-1" />
                      <h4 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1 pr-20">
                        {note.title || 'Untitled Note'}
                      </h4>
                    </div>
                    <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                      {note.content ? note.content.replace(/<[^>]*>/g, '').trim() || 'No content yet...' : 'No content yet...'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(note.updated_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </Link>

                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleEditClick(e, note.id)}
                      className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                      title="Edit note"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteClick(e, note)}
                      disabled={deletingNoteId === note.id}
                      className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-md disabled:opacity-50"
                      title="Delete note"
                    >
                      {deletingNoteId === note.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showDeleteConfirm && noteToDelete && (
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
                <p className="text-gray-600 mb-2">
                  Are you sure you want to delete <span className="font-semibold">"{noteToDelete.title || 'Untitled Note'}"</span>?
                </p>
                <p className="text-gray-500 text-sm mb-6">
                  This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setNoteToDelete(null);
                    }}
                    disabled={!!deletingNoteId}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={!!deletingNoteId}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {deletingNoteId ? (
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

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authModalMode}
      />
    </div>
  );
}
