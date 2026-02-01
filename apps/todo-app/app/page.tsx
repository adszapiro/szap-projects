"use client";

import { useState, useEffect } from "react";
import { supabase, Todo } from "@/lib/supabase";

const categoryConfig = {
  personal: { bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400", border: "border-violet-500/20" },
  work: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20" },
  shopping: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20" },
  other: { bg: "bg-slate-500/10", text: "text-slate-600 dark:text-slate-400", border: "border-slate-500/20" },
};

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputText, setInputText] = useState("");
  const [category, setCategory] = useState<Todo["category"]>("work");
  const [dueDate, setDueDate] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed" | "email">("all");
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<"all" | "manual" | "email">("all");

  const fetchTodos = async () => {
    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching todos:", error);
    } else {
      setTodos(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTodos();

    const channel = supabase
      .channel("todos-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "todos" },
        () => {
          fetchTodos(); // Refetch on any change for simplicity
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() === "") return;

    const { error } = await supabase.from("todos").insert({
      text: inputText.trim(),
      category: category,
      due_date: dueDate || null,
      source: "manual",
    });

    if (error) {
      console.error("Error adding todo:", error);
    } else {
      setInputText("");
      setDueDate("");
    }
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    const { error } = await supabase
      .from("todos")
      .update({ completed: !completed })
      .eq("id", id);

    if (error) {
      console.error("Error updating todo:", error);
    }
  };

  const deleteTodo = async (id: string) => {
    // Optimistic update - remove from UI immediately
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
    
    const { error } = await supabase.from("todos").delete().eq("id", id);

    if (error) {
      console.error("Error deleting todo:", error);
      fetchTodos(); // Refetch if error
    }
  };

  const clearCompleted = async () => {
    const completedIds = todos.filter(t => t.completed).map(t => t.id);
    setTodos((prev) => prev.filter((todo) => !todo.completed));
    
    const { error } = await supabase
      .from("todos")
      .delete()
      .eq("completed", true);

    if (error) {
      console.error("Error clearing completed:", error);
      fetchTodos();
    }
  };

  const filteredTodos = todos.filter((todo) => {
    // Status filter
    if (filter === "active" && todo.completed) return false;
    if (filter === "completed" && !todo.completed) return false;
    
    // Source filter
    if (sourceFilter === "email" && todo.source !== "email") return false;
    if (sourceFilter === "manual" && todo.source !== "manual") return false;
    
    return true;
  });

  const activeTodoCount = todos.filter((todo) => !todo.completed).length;
  const emailTodoCount = todos.filter((todo) => todo.source === "email" && !todo.completed).length;

  // Safe date parsing that handles both YYYY-MM-DD and ISO formats
  const parseDate = (dateString: string): Date => {
    // If it's an ISO timestamp (contains 'T'), extract just the date part
    if (dateString.includes('T')) {
      dateString = dateString.split('T')[0];
    }
    // Parse YYYY-MM-DD as local date (not UTC)
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = parseDate(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Compare year, month, day to avoid time issues
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (dateOnly.getTime() === today.getTime()) return "Today";
    if (dateOnly.getTime() === tomorrow.getTime()) return "Tomorrow";
    
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const isOverdue = (dateString: string | null) => {
    if (!dateString) return false;
    const date = parseDate(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Compare year, month, day only
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return dateOnly < today;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-violet-400/20 rounded-full blur-3xl" />
      </div>
      
      <div className="relative max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full mb-4">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-green-600 dark:text-green-400">Synced with Amanda's emails</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 dark:from-white dark:via-blue-200 dark:to-white bg-clip-text text-transparent mb-2">
            Alex's Tasks
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {activeTodoCount} active • {emailTodoCount} from email
          </p>
        </header>

        {/* Add Todo Form */}
        <form onSubmit={addTodo} className="mb-8">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 p-4">
            <div className="flex gap-3 mb-3">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Add a new task..."
                className="flex-1 px-4 py-3 rounded-xl bg-slate-100/50 dark:bg-slate-700/50 border-0 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Add
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {(["work", "personal", "shopping", "other"] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    category === cat
                      ? `${categoryConfig[cat].bg} ${categoryConfig[cat].text} border ${categoryConfig[cat].border}`
                      : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
              <div className="flex-1" />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-100/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </div>
        </form>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <div className="flex bg-white/60 dark:bg-slate-800/60 backdrop-blur rounded-xl p-1 border border-slate-200/50 dark:border-slate-700/50">
            {(["all", "active", "completed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === f
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          
          <div className="flex bg-white/60 dark:bg-slate-800/60 backdrop-blur rounded-xl p-1 border border-slate-200/50 dark:border-slate-700/50">
            {(["all", "email", "manual"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSourceFilter(s)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  sourceFilter === s
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                {s === "email" && "📧 "}
                {s === "manual" && "✏️ "}
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Todo List */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl p-12 text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-500">Loading tasks...</p>
            </div>
          ) : filteredTodos.length === 0 ? (
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-12 text-center">
              <div className="text-4xl mb-3">
                {filter === "completed" ? "🎉" : sourceFilter === "email" ? "📬" : "✨"}
              </div>
              <p className="text-slate-500 dark:text-slate-400">
                {filter === "completed"
                  ? "No completed tasks yet"
                  : filter === "active"
                  ? "All caught up! Great job!"
                  : sourceFilter === "email"
                  ? "No email tasks - check for new emails from Amanda"
                  : "No tasks yet. Add one above!"}
              </p>
            </div>
          ) : (
            filteredTodos.map((todo) => (
              <div
                key={todo.id}
                className={`group bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl border transition-all hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 ${
                  todo.completed 
                    ? "border-slate-200/30 dark:border-slate-700/30 opacity-60" 
                    : "border-slate-200/50 dark:border-slate-700/50"
                }`}
              >
                <div className="flex items-start gap-4 p-4">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleTodo(todo.id, todo.completed)}
                    className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      todo.completed
                        ? "bg-gradient-to-br from-green-400 to-emerald-500 border-transparent text-white shadow-lg shadow-green-500/25"
                        : "border-slate-300 dark:border-slate-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    }`}
                  >
                    {todo.completed && (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-slate-900 dark:text-white leading-relaxed ${
                      todo.completed ? "line-through text-slate-400 dark:text-slate-500" : ""
                    }`}>
                      {todo.text}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-md font-medium ${categoryConfig[todo.category].bg} ${categoryConfig[todo.category].text}`}>
                        {todo.category}
                      </span>
                      {todo.due_date && (
                        <span className={`text-xs font-medium ${
                          isOverdue(todo.due_date) && !todo.completed
                            ? "text-red-500"
                            : formatDate(todo.due_date) === "Today"
                            ? "text-amber-500"
                            : "text-slate-500 dark:text-slate-400"
                        }`}>
                          {isOverdue(todo.due_date) && !todo.completed ? "⚠️ " : ""}
                          {formatDate(todo.due_date)}
                        </span>
                      )}
                      {todo.source === "email" && (
                        <span className="inline-flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400 font-medium">
                          📧 Amanda
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Stats */}
        {todos.length > 0 && (
          <div className="flex items-center justify-between mt-6 px-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {activeTodoCount} task{activeTodoCount !== 1 ? "s" : ""} remaining
            </span>
            {todos.some((todo) => todo.completed) && (
              <button
                onClick={clearCompleted}
                className="text-sm text-slate-500 hover:text-red-500 transition-colors"
              >
                Clear completed
              </button>
            )}
          </div>
        )}

        {/* Back to Portfolio */}
        <div className="text-center mt-12 pt-8 border-t border-slate-200/50 dark:border-slate-700/50">
          <a
            href="https://portfolio-adszapiro.vercel.app"
            className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Portfolio
          </a>
        </div>
      </div>
    </div>
  );
}
