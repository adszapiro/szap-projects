// ============================================
// Resume Page - Alex Szapiro's Full Resume
// ============================================

import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ResumePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Header />
      
      <main className="max-w-4xl mx-auto px-6 py-20 pt-28">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Alexander Szapiro
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            <a href="mailto:aszapiro@umich.edu" className="hover:text-blue-600">aszapiro@umich.edu</a>
            {" | "}
            <a href="https://www.linkedin.com/in/alex-szapiro/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">LinkedIn</a>
            {" | "}
            <a href="https://github.com/adszapiro" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">GitHub</a>
          </p>
        </div>

        {/* Education Section */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 border-b-2 border-blue-600 pb-2">
            Education
          </h2>
          
          <div className="mb-4">
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  University of Michigan, Ann Arbor
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Bachelor of Arts in Economics, Minor in Real Estate
                </p>
              </div>
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                2024 - 2028
              </span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  NSU University School, Davie, FL
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  High School Diploma | GPA: 4.44/4.00 | ACT: 35
                </p>
              </div>
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                2019 - 2024
              </span>
            </div>
          </div>
        </section>

        {/* Professional Experience Section */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 border-b-2 border-blue-600 pb-2">
            Professional Experience
          </h2>
          
          <div className="mb-6">
            <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Churchill Real Estate
                </h3>
                <p className="text-blue-600 dark:text-blue-400">Private Credit Intern</p>
              </div>
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                July 2025 - Aug 2025
              </span>
            </div>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1 ml-4">
              <li>Assisted analysts with modeling capital stack structures and return analysis, supporting underwriting decisions</li>
              <li>Researched markets and provided support in drafting investment memos used by senior leadership</li>
            </ul>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Xtreme Action Park
                </h3>
                <p className="text-blue-600 dark:text-blue-400">Go-Kart Operations</p>
              </div>
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                July 2024
              </span>
            </div>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1 ml-4">
              <li>Led customer support behind the track, instructing racers on safety protocols</li>
              <li>Managed on-track safety and maintained track and go-kart conditions</li>
            </ul>
          </div>
        </section>

        {/* Leadership & Involvement Section */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 border-b-2 border-blue-600 pb-2">
            Leadership & Involvement
          </h2>
          
          <div className="mb-6">
            <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Michigan Sustainable Investments Club
                </h3>
                <p className="text-blue-600 dark:text-blue-400">VP of Marketing</p>
              </div>
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                Aug 2024 - Present
              </span>
            </div>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1 ml-4">
              <li>Conduct in-depth equity research on companies integrating ESG initiatives into business models</li>
              <li>Analyze sector-wide trends in clean energy, sustainable infrastructure, and circular economy initiatives</li>
              <li>Utilize Excel and financial databases (Bloomberg, FactSet) to monitor portfolio holdings</li>
            </ul>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Apex Trading Group
                </h3>
                <p className="text-blue-600 dark:text-blue-400">Associate Analyst</p>
              </div>
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                Jan 2025 - Present
              </span>
            </div>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1 ml-4">
              <li>Conduct weekly market research across equities, fixed income, and macroeconomic trends</li>
              <li>Prepare weekly performance summaries outlining risk-adjusted returns</li>
              <li>Present investment theses on specific sectors and companies during team meetings</li>
            </ul>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  South Florida Financial Assets Club
                </h3>
                <p className="text-blue-600 dark:text-blue-400">Founder & President</p>
              </div>
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                Aug 2022 - June 2024
              </span>
            </div>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1 ml-4">
              <li>Founded county-wide club with 60+ students; brought speakers to deliver finance workshops</li>
              <li>Connected students with finance professional mentors</li>
            </ul>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  USchool Student Government
                </h3>
                <p className="text-blue-600 dark:text-blue-400">Treasurer</p>
              </div>
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                Aug 2023 - June 2024
              </span>
            </div>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1 ml-4">
              <li>Managed $15,000+ budget; allocated funds to school-wide events</li>
            </ul>
          </div>
        </section>

        {/* Entrepreneurial Experience Section */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 border-b-2 border-blue-600 pb-2">
            Entrepreneurial Experience
          </h2>
          
          <div className="mb-6">
            <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Resell Miami
                </h3>
                <p className="text-blue-600 dark:text-blue-400">Founder & Owner</p>
              </div>
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                2019 - 2024
              </span>
            </div>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1 ml-4">
              <li>Built luxury goods reselling business with 200+ clients through social media marketing</li>
              <li>Generated $15K+ in revenue</li>
            </ul>
          </div>
        </section>

        {/* Honors & Awards Section */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 border-b-2 border-blue-600 pb-2">
            Honors & Awards
          </h2>
          <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1 ml-4">
            <li>National Honor Society (Aug 2021 - June 2024)</li>
            <li>National Hispanic Recognition Award</li>
          </ul>
        </section>

        {/* Skills & Interests Section */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 border-b-2 border-blue-600 pb-2">
            Skills & Interests
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Languages</h3>
              <p className="text-gray-600 dark:text-gray-300">Spanish - Proficient (read, write, speak)</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Technical</h3>
              <p className="text-gray-600 dark:text-gray-300">Excel, Bloomberg Terminal, FactSet, JavaScript, React, Next.js</p>
            </div>
            <div className="md:col-span-2">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Interests</h3>
              <p className="text-gray-600 dark:text-gray-300">Car Racing, Video Games, College Athletics, NFL, Padel, Music, Vinyls</p>
            </div>
          </div>
        </section>

        {/* Back to Home Link */}
        <div className="text-center mt-12">
          <a 
            href="/" 
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Back to Portfolio
          </a>
        </div>

      </main>

      <Footer />
    </div>
  );
}
