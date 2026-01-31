// ============================================
// Todo App - Now with Supabase Database!
// ============================================
// Tasks are stored in a real database and sync in real-time

"use client";

import { useState, useEffect } from "react";
import { supabase, Todo } from "@/lib/supabase";

// Category colors for visual distinction
const categoryColors = {
  personal: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  work: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  shopping: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
};

export default function TodoApp() {
  // ============================================
  // STATE
  // ============================================
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputText, setInputText] = useState("");
  const [category, setCategory] = useState<Todo["category"]>("personal");
  const [dueDate, setDueDate] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [loading, setLoading] = useState(true);

  // ============================================
  // FETCH TODOS FROM SUPABASE
  // ============================================
  const fetchTodos = async () => {
    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching todos:", error);
    } else {
      setTodos(data || []);
    }
    setLoading(false);
  };

  // ============================================
  // REAL-TIME SUBSCRIPTION
  // ============================================
  useEffect(() => {
    // Fetch initial todos
    fetchTodos();

    // Subscribe to real-time changes
    const channel = supabase
      .channel("todos-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "todos" },
        (payload) => {
          console.log("Real-time update:", payload);
          
          if (payload.eventType === "INSERT") {
            setTodos((prev) => [payload.new as Todo, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setTodos((prev) =>
              prev.map((todo) =>
                todo.id === payload.new.id ? (payload.new as Todo) : todo
              )
            );
          } else if (payload.eventType === "DELETE") {
            setTodos((prev) => prev.filter((todo) => todo.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ============================================
  // ADD TODO
  // ============================================
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

  // ============================================
  // TOGGLE TODO COMPLETION
  // ============================================
  const toggleTodo = async (id: string, completed: boolean) => {
    const { error } = await supabase
      .from("todos")
      .update({ completed: !completed })
      .eq("id", id);

    if (error) {
      console.error("Error updating todo:", error);
    }
  };

  // ============================================
  // DELETE TODO
  // ============================================
  const deleteTodo = async (id: string) => {
    const { error } = await supabase.from("todos").delete().eq("id", id);

    if (error) {
      console.error("Error deleting todo:", error);
    }
  };

  // ============================================
  // CLEAR COMPLETED
  // ============================================
  const clearCompleted = async () => {
    const { error } = await supabase
      .from("todos")
      .delete()
      .eq("completed", true);

    if (error) {
      console.error("Error clearing completed:", error);
    }
  };

  // ============================================
  // FILTERED TODOS
  // ============================================
  const filteredTodos = todos.filter((todo) => {
    if (filter === "active") return !todo.completed;
    if (filter === "completed") return todo.completed;
    return true;
  });

  const activeTodoCount = todos.filter((todo) => !todo.completed).length;

  // ============================================
  // FORMAT DATE FOR DISPLAY
  // ============================================
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Todo App
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Synced with Supabase • Real-time updates
          </p>
          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
            ✓ Connected to database
          </p>
        </header>

        {/* Add Todo Form */}
        <form onSubmit={addTodo} className="mb-6">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="What needs to be done?"
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Add
            </button>
          </div>
          
          <div className="flex gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Todo["category"])}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="personal">Personal</option>
              <option value="work">Work</option>
              <option value="shopping">Shopping</option>
              <option value="other">Other</option>
            </select>
            
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Due date"
            />
          </div>
        </form>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4">
          {(["all", "active", "completed"] as const).map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === filterOption
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </button>
          ))}
        </div>

        {/* Todo List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Loading todos...
            </div>
          ) : filteredTodos.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {filter === "all"
                ? "No todos yet. Add one above!"
                : filter === "active"
                ? "No active todos. Great job!"
                : "No completed todos yet."}
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTodos.map((todo) => (
                <li
                  key={todo.id}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleTodo(todo.id, todo.completed)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      todo.completed
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-gray-300 dark:border-gray-600 hover:border-blue-500"
                    }`}
                  >
                    {todo.completed && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  {/* Todo Text & Details */}
                  <div className="flex-1">
                    <p className={`text-gray-900 dark:text-white ${todo.completed ? "line-through text-gray-400 dark:text-gray-500" : ""}`}>
                      {todo.text}
                    </p>
                    <div className="flex gap-2 mt-1">
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${categoryColors[todo.category]}`}>
                        {todo.category}
                      </span>
                      {todo.due_date && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Due: {formatDate(todo.due_date)}
                        </span>
                      )}
                      {todo.source === "email" && (
                        <span className="text-xs text-blue-500 dark:text-blue-400">
                          📧 from email
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Footer */}
          {todos.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">
                {activeTodoCount} item{activeTodoCount !== 1 ? "s" : ""} left
              </span>
              {todos.some((todo) => todo.completed) && (
                <button
                  onClick={clearCompleted}
                  className="text-gray-500 hover:text-red-500 transition-colors text-sm"
                >
                  Clear completed
                </button>
              )}
            </div>
          )}
        </div>

        {/* Back to Portfolio Link */}
        <div className="text-center mt-8">
          <a
            href="https://portfolio-adszapiro.vercel.app"
            className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm"
          >
            ← Back to Portfolio
          </a>
        </div>
      </div>
    </div>
  );
}
