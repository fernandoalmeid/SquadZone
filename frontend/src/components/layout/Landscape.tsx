function Landscape() {
  return (
    <svg
      className="landscape"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a99be0" />
          <stop offset="45%" stopColor="#c8c4ea" />
          <stop offset="75%" stopColor="#d4ecd9" />
        </linearGradient>
      </defs>

      <rect width="1440" height="900" fill="url(#sky)" />

      <g fill="#ffffff" opacity="0.35">
        <path d="M0 70 Q200 20 420 60 T820 50 T1200 70 T1440 40 V0 H0z" />
        <path d="M-50 200 Q180 150 380 190 T760 180 L760 215 Q400 230 -50 225z" />
        <path d="M900 160 Q1100 120 1300 150 T1500 140 L1500 185 Q1150 200 900 190z" />
      </g>

      <g fill="none" stroke="#3a2d7a" strokeWidth="3" strokeLinecap="round">
        <path d="M1030 40 q10 -8 20 0 q10 -8 20 0" />
        <path d="M925 85 q6 -5 12 0 q6 -5 12 0" />
        <path d="M965 70 q5 -4 10 0 q5 -4 10 0" />
        <path d="M1255 180 q4 -3 8 0 q4 -3 8 0" />
      </g>

      <path
        fill="#8b7fd6"
        d="M0 380 L180 300 L320 360 L470 260 L640 350 L820 250 L980 330 L1130 150 L1300 300 L1440 260 V900 H0z"
      />
      <path
        fill="#5b45c4"
        d="M760 520 L960 300 L1060 260 L1130 145 L1250 250 L1340 330 L1440 400 V900 H760z"
      />
      <path
        fill="#4a36ae"
        opacity="0.6"
        d="M1130 145 L1250 250 L1340 330 L1440 400 V900 H1180 L1150 500 L1170 300z"
      />
      <path
        fill="#6a55cc"
        d="M0 480 L90 400 L180 410 L270 470 L420 430 L560 500 L700 470 L860 540 L1000 480 L1160 540 L1300 500 L1440 560 V900 H0z"
      />
      <path
        fill="#3f2d98"
        d="M0 560 L150 520 L260 590 L400 540 L560 620 L720 570 L900 640 L1080 590 L1260 650 L1440 600 V900 H0z"
      />
      <path fill="#2f2180" d="M0 660 Q300 610 560 680 T1100 670 T1440 650 V900 H0z" />
      <path
        fill="#1f1560"
        d="M0 760 L20 720 L32 760 L48 700 L62 760 L80 730 L94 770 L112 690 L128 770 L150 740 L168 780
        L190 720 L205 780 L230 750 L250 790 L280 760 L310 800 L360 780 L420 810 L480 790 L540 815
        L600 800 L660 820 L720 800 L780 815 L840 790 L880 760 L895 720 L910 770 L930 700 L948 770
        L965 740 L980 680 L998 760 L1015 720 L1030 770 L1050 690 L1068 770 L1085 730 L1100 770
        L1120 700 L1138 770 L1160 720 L1178 780 L1200 690 L1218 780 L1240 730 L1258 790 L1280 700
        L1298 790 L1320 740 L1340 790 L1360 710 L1378 790 L1400 750 L1420 790 L1440 740 V900 H0z"
      />
      <path fill="#170f4a" d="M0 840 Q360 800 720 840 T1440 830 V900 H0z" />
    </svg>
  );
}

export default Landscape;
