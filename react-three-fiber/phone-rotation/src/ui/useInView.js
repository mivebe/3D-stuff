import { useEffect, useRef, useState } from "react";

// lightweight reveal-on-scroll, no extra deps
export function useInView(options = { threshold: 0.2 }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        io.unobserve(el);
      }
    }, options);
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return [ref, inView];
}
