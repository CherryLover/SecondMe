import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useI18n } from '@/contexts/I18nContext'
import { Sun, Moon, Languages, ArrowRight, BookOpen, Anchor, History, Shield } from 'lucide-react'
import { AmbientBackground } from '@/components/landing/AmbientBackground'
import { FadeIn } from '@/components/landing/FadeIn'
import { Logo } from '@/components/common/Logo'
import type { AppMessages } from '@/i18n/translations'

const CTA_NAV_ENABLED = false

export default function LandingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { language, toggleLanguage, tm } = useI18n()
  const [ctaNoticeVisible, setCtaNoticeVisible] = useState(false)
  const ctaNoticeTimer = useRef<number | null>(null)
  const landing = tm<AppMessages['landing']>('landing')

  if (!landing) {
    return null
  }

  const { nav, hero, sections, footer } = landing
  const { origin, define, boundary, vision, privacy } = sections
  const langBadge = language === 'zh' ? nav.langShort.en : nav.langShort.zh
  const defineNotList = define.notList as readonly string[]
  const defineIsList = define.isList as readonly string[]
  const boundaryTags = boundary.tags as readonly string[]
  const visionCards = vision.cards as ReadonlyArray<{ title: string; desc: string }>

  useEffect(() => {
    return () => {
      if (ctaNoticeTimer.current) {
        window.clearTimeout(ctaNoticeTimer.current)
      }
    }
  }, [])

  const handleCTA = () => {
    setCtaNoticeVisible(true)
    if (ctaNoticeTimer.current) {
      window.clearTimeout(ctaNoticeTimer.current)
    }
    ctaNoticeTimer.current = window.setTimeout(() => {
      setCtaNoticeVisible(false)
    }, 4000)

    if (CTA_NAV_ENABLED) {
      if (user) {
        navigate('/app')
      } else {
        navigate('/login')
      }
    }
  }

  return (
    <div className="min-h-screen bg-paper dark:bg-darkPaper text-ink dark:text-darkInk transition-colors duration-500 relative overflow-x-hidden selection:bg-accent/20 dark:selection:bg-darkAccent/20">

      <AmbientBackground />

      {/* Noise Texture Overlay */}
      <div className="fixed inset-0 bg-noise pointer-events-none z-50 mix-blend-multiply dark:mix-blend-soft-light opacity-100 dark:opacity-20"></div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full p-6 md:p-12 z-[60] flex justify-between items-center mix-blend-difference md:mix-blend-normal">
        <Logo />
        <div className="flex items-center gap-4">
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-ink/5 dark:hover:bg-white/5 transition-colors duration-300 focus:outline-none text-sm font-medium opacity-80 hover:opacity-100"
            aria-label={nav.toggleLang}
          >
            <Languages className="w-4 h-4" />
            <span className="font-serif pt-0.5">{langBadge}</span>
          </button>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-ink/5 dark:hover:bg-white/5 transition-colors duration-300 focus:outline-none"
            aria-label={nav.toggleTheme}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-darkInk/70" strokeWidth={1.5} />
            ) : (
              <Moon className="w-5 h-5 text-ink/70" strokeWidth={1.5} />
            )}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="min-h-screen flex flex-col justify-center items-center px-6 md:px-24 relative z-10">
        <div className="max-w-3xl text-center relative">

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] -z-10 pointer-events-none opacity-40 dark:opacity-20">
             <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
               <path fill="none" stroke="currentColor" strokeWidth="0.5" className="text-accent dark:text-darkAccent" d="M 100, 100 m -75, 0 a 75,75 0 1,0 150,0 a 75,75 0 1,0 -150,0" strokeDasharray="4 4">
                 <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="120s" repeatCount="indefinite"/>
               </path>
             </svg>
          </div>

          <FadeIn delay={200}>
            <h1
              className="font-serif text-3xl md:text-5xl lg:text-6xl leading-tight font-light text-ink/90 dark:text-darkInk/90 mb-8 md:mb-12"
              dangerouslySetInnerHTML={{ __html: hero.title }}
            />
          </FadeIn>

          <FadeIn delay={800}>
            <p className="text-subInk dark:text-darkSubInk font-serif text-base md:text-xl tracking-wide opacity-80">
              {hero.subtitle}
            </p>
          </FadeIn>
        </div>

        <FadeIn delay={1500} className="absolute bottom-12 text-muted dark:text-muted/60 text-xs md:text-sm animate-pulse tracking-widest">
          {hero.scroll}
        </FadeIn>
      </header>

      <main className="max-w-4xl mx-auto px-6 md:px-12 pb-32 relative z-10">

        {/* Section 1: Origin */}
        <section className="py-20 md:py-32 border-t border-muted/10 dark:border-white/5 relative">
          <div className="absolute -left-4 md:-left-12 top-40 w-12 h-24 pointer-events-none opacity-30 dark:opacity-20">
            <svg viewBox="0 0 50 100" fill="none" stroke="currentColor" className="text-muted dark:text-darkAccent" strokeWidth="1.5">
              <path d="M10,10 C30,20 0,30 20,40 C40,50 10,60 30,70 C50,80 20,90 20,90" strokeLinecap="round" />
            </svg>
          </div>
          <FadeIn>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
              <div className="md:col-span-4 text-accent dark:text-darkAccent font-serif text-xs md:text-sm tracking-widest uppercase mt-2 opacity-60">
                {origin.label}
              </div>
              <div className="md:col-span-8 space-y-6 md:space-y-8">
                <h2 className="font-serif text-2xl md:text-3xl text-ink dark:text-darkInk">{origin.title}</h2>
                <div className="text-subInk dark:text-darkSubInk font-light leading-relaxed md:leading-loose space-y-6 text-base md:text-lg">
                  <p dangerouslySetInnerHTML={{ __html: origin.content[0] }} />
                  <p dangerouslySetInnerHTML={{ __html: origin.content[1] }} />
                  <blockquote className="border-l-2 border-accent/30 dark:border-darkAccent/30 pl-6 italic my-8 text-ink/80 dark:text-darkInk/80 relative">
                    <span dangerouslySetInnerHTML={{ __html: origin.quote }} />
                  </blockquote>
                  <p>{origin.conclusion}</p>
                </div>
              </div>
            </div>
          </FadeIn>
        </section>

        {/* Section 2: Define */}
        <section className="py-20 md:py-32 border-t border-muted/10 dark:border-white/5">
          <FadeIn>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
              <div className="md:col-span-4 text-accent dark:text-darkAccent font-serif text-xs md:text-sm tracking-widest uppercase mt-2 opacity-60">
                {define.label}
              </div>
              <div className="md:col-span-8">
                <h2 className="font-serif text-2xl md:text-3xl mb-8 md:mb-12 text-ink dark:text-darkInk">{define.title}</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 md:gap-12">
                  <div className="space-y-4">
                    <h3 className="font-serif text-sm md:text-lg text-ink/40 dark:text-darkInk/30 border-b border-muted/20 dark:border-white/10 pb-2 uppercase tracking-widest">{define.notThis}</h3>
                    <ul className="space-y-3 text-subInk/80 dark:text-darkSubInk/60 font-light text-sm md:text-base">
                      {defineNotList.map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="text-muted dark:text-muted/60 leading-none">×</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-4 relative">
                    <svg className="absolute -top-4 -left-4 w-[120%] h-[120%] pointer-events-none opacity-10 dark:opacity-10 text-accent dark:text-darkAccent" viewBox="0 0 200 150" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20,10 C50,-10 180,10 190,50 C200,100 150,140 50,130 C-10,120 10,30 20,10" strokeLinecap="round" strokeDasharray="300 300">
                        <animate attributeName="stroke-dashoffset" from="300" to="0" dur="2s" fill="freeze" />
                      </path>
                    </svg>
                    <h3 className="font-serif text-sm md:text-lg text-accent dark:text-darkAccent border-b border-muted/20 dark:border-white/10 pb-2 uppercase tracking-widest">{define.isThis}</h3>
                    <ul className="space-y-3 text-ink dark:text-darkInk font-normal text-sm md:text-base">
                      {defineIsList.map((item, i) => (
                         <li key={i} className="flex items-start gap-3">
                           <span className="text-accent dark:text-darkAccent leading-none">●</span> {item}
                         </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div
                  className="mt-12 text-subInk dark:text-darkSubInk font-light leading-relaxed text-sm md:text-base italic opacity-80"
                  dangerouslySetInnerHTML={{ __html: define.summary }}
                />
              </div>
            </div>
          </FadeIn>
        </section>

        {/* Section 3: Boundary */}
        <section className="py-20 md:py-32 border-t border-muted/10 dark:border-white/5">
          <FadeIn>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
              <div className="md:col-span-4 text-accent dark:text-darkAccent font-serif text-xs md:text-sm tracking-widest uppercase mt-2 opacity-60">
                {boundary.label}
              </div>
              <div className="md:col-span-8 space-y-6 md:space-y-8">
                <h2 className="font-serif text-2xl md:text-3xl text-ink dark:text-darkInk">{boundary.title}</h2>
                <div className="bg-white/40 dark:bg-white/5 p-6 md:p-10 rounded-sm border border-muted/10 dark:border-white/10 backdrop-blur-sm">
                  <p className="text-subInk dark:text-darkSubInk leading-relaxed md:leading-loose mb-6 text-sm md:text-base" dangerouslySetInnerHTML={{__html: boundary.intro}} />
                  <div className="flex flex-wrap gap-2 md:gap-3 mb-8">
                     {boundaryTags.map((tag) => (
                       <span key={tag} className="px-3 py-1 bg-muted/5 dark:bg-white/5 text-muted dark:text-darkSubInk/70 text-xs md:text-sm rounded-full border border-muted/10 dark:border-white/5">{tag}</span>
                     ))}
                  </div>
                  <p className="text-ink dark:text-darkInk font-serif text-base md:text-lg">
                    {boundary.conclusion}
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>
        </section>

        {/* Section 4: Vision */}
        <section className="py-20 md:py-32 border-t border-muted/10 dark:border-white/5">
          <FadeIn>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
              <div className="md:col-span-4 text-accent dark:text-darkAccent font-serif text-xs md:text-sm tracking-widest uppercase mt-2 opacity-60">
                {vision.label}
              </div>
              <div className="md:col-span-8 space-y-10 md:space-y-12">
                <h2 className="font-serif text-2xl md:text-3xl text-ink dark:text-darkInk">{vision.title}</h2>

                <div className="grid grid-cols-1 gap-8 md:gap-10">
                  <div className="flex gap-4 group">
                    <div className="mt-1 transition-transform duration-500 group-hover:scale-110">
                      <History className="w-5 h-5 md:w-6 md:h-6 text-accent dark:text-darkAccent shrink-0" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg text-ink dark:text-darkInk mb-2">{visionCards[0].title}</h3>
                      <p className="text-subInk dark:text-darkSubInk font-light text-sm md:text-base">{visionCards[0].desc}</p>
                    </div>
                  </div>

                  <div className="flex gap-4 group">
                    <div className="mt-1 transition-transform duration-500 group-hover:scale-110">
                      <Anchor className="w-5 h-5 md:w-6 md:h-6 text-accent dark:text-darkAccent shrink-0" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg text-ink dark:text-darkInk mb-2">{visionCards[1].title}</h3>
                      <p className="text-subInk dark:text-darkSubInk font-light text-sm md:text-base">{visionCards[1].desc}</p>
                    </div>
                  </div>

                  <div className="flex gap-4 group">
                    <div className="mt-1 transition-transform duration-500 group-hover:scale-110">
                      <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-accent dark:text-darkAccent shrink-0" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg text-ink dark:text-darkInk mb-2">{visionCards[2].title}</h3>
                      <p className="text-subInk dark:text-darkSubInk font-light text-sm md:text-base">{visionCards[2].desc}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </section>

        {/* Section 5: Privacy */}
        <section className="py-20 md:py-32 border-t border-muted/10 dark:border-white/5">
          <FadeIn>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
              <div className="md:col-span-4 text-accent dark:text-darkAccent font-serif text-xs md:text-sm tracking-widest uppercase mt-2 opacity-60">
                {privacy.label}
              </div>
              <div className="md:col-span-8">
                 <div className="flex items-start gap-4 mb-6">
                    <Shield className="w-5 h-5 md:w-6 md:h-6 text-ink/40 dark:text-darkInk/40 mt-1" strokeWidth={1.5} />
                    <h2 className="font-serif text-2xl md:text-3xl text-ink dark:text-darkInk">{privacy.title}</h2>
                 </div>
                <div className="text-subInk dark:text-darkSubInk font-light leading-relaxed md:leading-loose text-sm md:text-lg space-y-4">
                  <p>{privacy.p1}</p>
                  <p dangerouslySetInnerHTML={{__html: privacy.p2}} />
                  <p className="text-ink dark:text-darkInk pt-2">{privacy.p3}</p>
                </div>
              </div>
            </div>
          </FadeIn>
        </section>

        {/* Footer */}
        <footer className="py-24 md:py-32 mt-12 border-t border-muted/10 dark:border-white/5 text-center relative overflow-hidden">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none opacity-5 dark:opacity-5">
            <svg viewBox="0 0 400 200" preserveAspectRatio="none" className="w-full h-full">
              <path d="M0,200 C100,150 300,150 400,200" fill="none" stroke="currentColor" strokeWidth="1" className="text-ink dark:text-white" />
              <path d="M0,200 C100,100 300,100 400,200" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-ink dark:text-white" />
            </svg>
          </div>
          <FadeIn>
            <h2
              className="font-serif text-2xl md:text-4xl text-ink dark:text-darkInk mb-6 md:mb-8 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: footer.title }}
            />
            <p className="text-subInk dark:text-darkSubInk mb-10 md:mb-12 font-light max-w-md mx-auto px-4 text-sm md:text-base">
              {footer.desc}
            </p>

            <button
              onClick={handleCTA}
              className="inline-flex items-center gap-3 px-8 py-4 border border-ink/10 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:bg-paperDark dark:hover:bg-white/10 transition-all duration-500 rounded-sm text-ink dark:text-darkInk group text-sm md:text-base shadow-sm relative z-10"
            >
              <span className="font-serif tracking-wide">{footer.cta}</span>
              <ArrowRight className="w-4 h-4 text-muted dark:text-muted/60 group-hover:text-accent dark:group-hover:text-darkAccent transition-transform duration-300 group-hover:translate-x-1" />
            </button>
            <div className="mt-6 w-full flex justify-center">
              <div
                aria-hidden={!ctaNoticeVisible}
                className={`flex max-w-md flex-col items-center text-center gap-3 rounded-sm border border-white/40 dark:border-white/10 bg-white/70 dark:bg-darkPaper/60 px-6 py-4 text-xs md:text-sm text-ink/80 dark:text-darkInk/90 leading-relaxed whitespace-pre-line transition-all duration-500 ease-out ${
                  ctaNoticeVisible ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-4'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-accent dark:bg-darkAccent animate-pulse" />
                <p className="font-light whitespace-pre-line">{footer.notice}</p>
              </div>
            </div>

            <div className="mt-20 md:mt-24 text-muted/30 dark:text-muted/15 text-[10px] md:text-xs tracking-[0.3em] uppercase">
              {footer.copyright}
            </div>
          </FadeIn>
        </footer>

      </main>
    </div>
  )
}
