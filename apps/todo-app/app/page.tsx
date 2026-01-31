// ============================================
// Todo App - Learning useState, Forms, and Local Storage
// ============================================

// "use client" tells Next.js this component runs in the browser
// We need this because useState only works in the browser
"use client";

import { useState, useEffect } from "react";

// ============================================
// TypeScript Interface - Define the shape of a Todo
// ============================================
interface Todo {
  id: number;
  text: string;
  completed: boolean;
  category: "personal" | "work" | "shopping" | "other";
  createdAt: Date;
}

// Category colors for visual distinction
const categoryColors = {
  personal: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  work: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  shopping: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
};

export default function TodoApp() {
  // ============================================
  // STATE - Data that changes over time
  // ============================================
  
  // useState returns [currentValue, functionToUpdateValue]
  // When you call the update function, React re-renders the component
  
  const [todos, setTodos] = useState<Todo[]>([]); // Array of todos
  const [inputText, setInputText] = useState(""); // Text in the input field
  const [category, setCategory] = useState<Todo["category"]>("personal"); // Selected category
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all"); // Filter view

  // ============================================
  // useEffect - Run code when component loads
  // ============================================
  // Load todos from localStorage when the app starts
  useEffect(() => {
    const savedTodos = localStorage.getItem("todos");
    if (savedTodos) {
      setTodos(JSON.parse(savedTodos));
    }
  }, []); // Empty array means "run once when component mounts"

  // Save todos to localStorage whenever they change
  useEffect(() => {
    if (todos.length > 0) {
      localStorage.setItem("todos", JSON.stringify(todos));
    }
  }, [todos]); // Run whenever 'todos' changes

  // ============================================
  // FUNCTIONS - Handle user actions
  // ============================================
  
  // Add a new todo
  const addTodo = (e: React.FormEvent) => {
    e.preventDefault(); // Prevent page refresh on form submit
    
    if (inputText.trim() === "") return; // Don't add empty todos
    
    const newTodo: Todo = {
      id: Date.now(), // Simple unique ID using timestamp
      text: inputText.trim(),
      completed: false,
      category: category,
      createdAt: new Date(),
    };
    
    // Update state with new todo
    // We create a NEW array with all old todos plus the new one
    setTodos([...todos, newTodo]);
    setInputText(""); // Clear the input
  };

  // Toggle todo completion
  const toggleTodo = (id: number) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  // Delete a todo
  const deleteTodo = (id: number) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  // Clear all completed todos
  const clearCompleted = () => {
    setTodos(todos.filter((todo) => !todo.completed));
  };

  // ============================================
  // FILTERED TODOS - Computed from state
  // ============================================
  const filteredTodos = todos.filter((todo) => {
    if (filter === "active") return !todo.completed;
    if (filter === "completed") return todo.completed;
    return true; // "all"
  });

  const activeTodoCount = todos.filter((todo) => !todo.completed).length;

  // ============================================
  // RENDER - The UI
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
            Stay organized and get things done
          </p>
        </header>

        {/* Add Todo Form */}
        <form onSubmit={addTodo} className="mb-6">
          <div className="flex gap-2 mb-3">
            {/* Text Input */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="What needs to be done?"
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            {/* Category Select */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Todo["category"])}
              className="px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="personal">Personal</option>
              <option value="work">Work</option>
              <option value="shopping">Shopping</option>
              <option value="other">Other</option>
            </select>
            
            {/* Submit Button */}
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Add
            </button>
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
          {filteredTodos.length === 0 ? (
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
                    onClick={() => toggleTodo(todo.id)}
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

                  {/* Todo Text & Category */}
                  <div className="flex-1">
                    <p
                      className={`text-gray-900 dark:text-white ${
                        todo.completed ? "line-through text-gray-400 dark:text-gray-500" : ""
                      }`}
                    >
                      {todo.text}
                    </p>
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${categoryColors[todo.category]}`}>
                      {todo.category}
                    </span>
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
            href="https://github.com/adszapiro"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm"
          >
            Built by Alex Szapiro
          </a>
        </div>
      </div>
    </div>
  );
}
