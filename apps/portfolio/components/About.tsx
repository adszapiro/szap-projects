// ============================================
// About Component - Alex's Story
// ============================================

export default function About() {
  return (
    <section id="about" className="mb-20 scroll-mt-20">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
        About Me
      </h2>

      <div className="max-w-3xl mx-auto">
        <div className="prose dark:prose-invert mx-auto text-gray-600 dark:text-gray-300">
          <p className="text-lg mb-4">
            I'm a first-year student at the University of Michigan studying Economics 
            with a minor in Real Estate, while exploring my growing interest in 
            technology and software development through the School of Information.
          </p>
          
          <p className="text-lg mb-4">
            My background spans finance, entrepreneurship, and technology. I've founded 
            a luxury goods reselling business, led investment clubs, and worked as a 
            Private Credit Intern at Churchill Real Estate. Now I'm expanding my skill 
            set into software engineering to combine my business acumen with technical abilities.
          </p>

          <p className="text-lg mb-6">
            When I'm not coding or analyzing markets, you can find me at the go-kart 
            track, watching college athletics and the NFL, playing padel, or adding 
            to my vinyl collection. I'm always open to connecting with fellow students 
            and professionals in finance and tech.
          </p>
        </div>

        {/* Quick facts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">2028</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Expected Grad</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">$15K+</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Business Revenue</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">200+</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Clients Served</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">4.44</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">HS GPA</p>
          </div>
        </div>
      </div>
    </section>
  );
}
