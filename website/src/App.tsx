import { Nav } from './components/Nav';
import { Hero } from './components/Hero';
import { Promises } from './components/Promises';
import { Frameworks } from './components/Frameworks';
import { Features } from './components/Features';
import { CodeSample } from './components/CodeSample';
import { HowItWorks } from './components/HowItWorks';
import { FAQ } from './components/FAQ';
import { CTA } from './components/CTA';
import { Footer } from './components/Footer';

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Promises />
        <Frameworks />
        <Features />
        <CodeSample />
        <HowItWorks />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
