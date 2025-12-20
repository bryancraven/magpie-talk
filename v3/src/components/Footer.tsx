'use client';

import { motion } from 'framer-motion';

export function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="border-t border-zinc-800/50 bg-zinc-950 px-4 py-8 text-center"
    >
      <div className="mx-auto max-w-2xl">
        <p className="text-sm leading-relaxed text-zinc-500">
          Magpie Talk is a personal speech-practice tool inspired by evidence-based
          fluency-shaping research
          <sup>
            <a
              href="https://scholar.google.com/scholar?q=Brignell+systematic+review+interventions+adults+stutter"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-zinc-300"
            >
              [1]
            </a>
          </sup>
          <sup>
            <a
              href="https://scholar.google.com/scholar?q=Packman+prolonged+speech+modification+stuttering"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-zinc-300"
            >
              [2]
            </a>
          </sup>
          <sup>
            <a
              href="https://scholar.google.com/scholar?q=Blomgren+behavioral+treatments+children+adults+stutter"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-zinc-300"
            >
              [3]
            </a>
          </sup>
          . It is not clinical treatment, and I am not a clinician. I built this
          because I personally find prolonged-speech practice helpful. For
          assessment or therapy, please consult a certified speech-language
          pathologist.
        </p>
        <p className="mt-4 text-xs text-zinc-600">
          &copy; {new Date().getFullYear()} Magpie Talk
        </p>
      </div>
    </motion.footer>
  );
}

export default Footer;
