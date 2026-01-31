// ============================================
// Hero Component - The First Thing Visitors See
// ============================================

export default function Hero() {
  const name = "Alex Szapiro";
  const title = "School of Information Student @ University of Michigan";
  const bio = "Passionate about the intersection of finance, technology, and entrepreneurship. Building my skills in software development while leveraging my background in economics and investing.";

  return (
    <section id="home" className="text-center mb-20 pt-20">
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
        Welcome to my portfolio
      </p>
      
      <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-4">
        Hi, I'm <span className="text-blue-600 dark:text-blue-400">{name}</span>
      </h1>
      
      <h2 className="text-2xl md:text-3xl text-gray-700 dark:text-gray-300 mb-6">
        {title}
      </h2>
      
      <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
        {bio}
      </p>

      <div className="flex flex-wrap justify-center gap-4">
        <a
          href="#projects"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          View My Work
        </a>
        <a
          href="/resume"
          className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
        >
          View Resume
        </a>
        <a
          href="#contact"
          className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
        >
          Get In Touch
        </a>
      </div>
    </section>
  );
}
