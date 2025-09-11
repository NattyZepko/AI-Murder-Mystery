<div class="hero-row">
  <div style="font-size:44px">✨</div>
  <div>
    ## How it feels
  </div>
</div>

<div style="display:flex;justify-content:center;align-items:center">
  <!-- Embedded SVG diagram retained from earlier, slightly resized to fit new card -->
  <svg width="760" height="260" viewBox="0 0 760 260" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <marker id="arrowDark" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
        <path d="M0,0 L10,5 L0,10 z" fill="#15384f" />
      </marker>
      <marker id="arrowOrange" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
        <path d="M0,0 L12,6 L0,12 z" fill="#F28B30" />
      </marker>
    </defs>

    <!-- Client -->
    <g transform="translate(60,130)">
      <rect x="-70" y="-30" width="140" height="60" rx="10" fill="#ffffff" stroke="#2a6b9a" stroke-width="2"/>
      <text x="0" y="6" font-size="12" text-anchor="middle" fill="#15384f" font-weight="700">Client UI</text>
    </g>

    <!-- Suspects -->
    <g>
      <g transform="translate(240,40)">
        <circle cx="0" cy="0" r="28" fill="#FFDDE0" stroke="#FF8B8B" stroke-width="1.5"/>
        <text x="0" y="44" font-size="11" text-anchor="middle" fill="#222">Suspect A</text>
      </g>
      <g transform="translate(240,130)">
        <circle cx="0" cy="0" r="28" fill="#FFF7D6" stroke="#F2C94C" stroke-width="1.5"/>
        <text x="0" y="44" font-size="11" text-anchor="middle" fill="#222">Suspect B</text>
      </g>
      <g transform="translate(240,220)">
        <circle cx="0" cy="0" r="28" fill="#DFF7E6" stroke="#57C27D" stroke-width="1.5"/>
        <text x="0" y="44" font-size="11" text-anchor="middle" fill="#222">Suspect C</text>
      </g>
    </g>

    <!-- LLM -->
    <g transform="translate(440,130)">
      <rect x="-70" y="-36" width="140" height="72" rx="10" fill="#15384f"/>
      <text x="0" y="4" font-size="12" text-anchor="middle" fill="#fff">LLM / Adapter</text>
    </g>

    <!-- Clue Extractor -->
    <g transform="translate(620,90)">
      <rect x="-60" y="-28" width="120" height="56" rx="8" fill="#ffffff" stroke="#2a6b9a" stroke-width="1.5"/>
      <text x="0" y="6" font-size="11" text-anchor="middle" fill="#15384f">Clue Extractor</text>
    </g>

    <!-- Arrows -->
    <path d="M130,130 C180,130 200,130 200,100" stroke="#15384f" stroke-width="2.5" fill="none" marker-end="url(#arrowDark)"/>
    <text x="150" y="110" font-size="11" fill="#15384f">player asks</text>

    <path d="M268,40 C330,40 380,92 420,92" stroke="#15384f" stroke-width="2.5" fill="none" marker-end="url(#arrowDark)"/>
    <text x="330" y="60" font-size="11" fill="#15384f">suspect reply</text>

    <path d="M268,130 C330,130 380,120 420,120" stroke="#15384f" stroke-width="2.5" fill="none" marker-end="url(#arrowDark)"/>
    <text x="330" y="140" font-size="11" fill="#15384f">suspect reply</text>

    <path d="M268,220 C330,220 380,150 420,150" stroke="#15384f" stroke-width="2.5" fill="none" marker-end="url(#arrowDark)"/>
    <text x="330" y="200" font-size="11" fill="#15384f">suspect reply</text>

    <path d="M510,130 C570,130 600,120 580,120" stroke="#F28B30" stroke-width="3" fill="none" marker-end="url(#arrowOrange)"/>
    <text x="540" y="118" font-size="11" fill="#F28B30">LLM → extractor</text>

    <path d="M620,118 C580,150 480,150 230,150 C200,150 180,150 140,150" stroke="#2a6b9a" stroke-width="2.5" fill="none" marker-end="url(#arrowDark)"/>
    <text x="380" y="160" font-size="11" fill="#2a6b9a">structured clues → UI</text>
  </svg>
</div>

<aside class="notes">Use this slide to paint the user experience: you click or type to ask a suspect a question, the suspect answers (in character), the system extracts interesting facts and shows them as clues, and you use those clues to form a theory and accuse.</aside>
