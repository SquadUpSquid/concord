import { useState, useMemo } from "react";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const EMOJI_CATEGORIES: { name: string; emojis: string[] }[] = [
  {
    name: "Smileys",
    emojis: [
      "\u{1F600}", "\u{1F603}", "\u{1F604}", "\u{1F601}", "\u{1F606}", "\u{1F605}",
      "\u{1F602}", "\u{1F923}", "\u{1F642}", "\u{1F643}", "\u{1F609}", "\u{1F60A}",
      "\u{1F60D}", "\u{1F970}", "\u{1F618}", "\u{1F617}", "\u{1F619}", "\u{1F61A}",
      "\u{1F60B}", "\u{1F61B}", "\u{1F61C}", "\u{1F61D}", "\u{1F911}", "\u{1F917}",
      "\u{1F914}", "\u{1F910}", "\u{1F928}", "\u{1F610}", "\u{1F611}", "\u{1F636}",
      "\u{1F60F}", "\u{1F612}", "\u{1F644}", "\u{1F62C}", "\u{1F925}", "\u{1F60C}",
      "\u{1F614}", "\u{1F62A}", "\u{1F924}", "\u{1F634}", "\u{1F637}", "\u{1F912}",
      "\u{1F915}", "\u{1F922}", "\u{1F92E}", "\u{1F927}", "\u{1F975}", "\u{1F976}",
      "\u{1F974}", "\u{1F635}", "\u{1F92F}", "\u{1F920}", "\u{1F973}", "\u{1F978}",
      "\u{1F60E}", "\u{1F913}", "\u{1F9D0}", "\u{1F615}", "\u{1F61F}", "\u{1F641}",
      "\u{2639}\uFE0F", "\u{1F62E}", "\u{1F62F}", "\u{1F632}", "\u{1F633}", "\u{1F97A}",
      "\u{1F626}", "\u{1F627}", "\u{1F628}", "\u{1F630}", "\u{1F625}", "\u{1F622}",
      "\u{1F62D}", "\u{1F631}", "\u{1F616}", "\u{1F623}", "\u{1F61E}", "\u{1F613}",
      "\u{1F629}", "\u{1F62B}", "\u{1F624}", "\u{1F621}", "\u{1F620}", "\u{1F92C}",
    ],
  },
  {
    name: "Gestures",
    emojis: [
      "\u{1F44D}", "\u{1F44E}", "\u{1F44A}", "\u270A", "\u{1F91B}", "\u{1F91C}",
      "\u{1F44F}", "\u{1F64C}", "\u{1F450}", "\u{1F932}", "\u{1F91D}", "\u{1F64F}",
      "\u270D\uFE0F", "\u{1F485}", "\u{1F933}", "\u{1F4AA}", "\u{1F9BE}", "\u{1F9BF}",
      "\u{1F44B}", "\u{1F91A}", "\u{1F590}\uFE0F", "\u270B", "\u{1F596}", "\u{1F44C}",
      "\u{1F90C}", "\u{1F90F}", "\u270C\uFE0F", "\u{1F91E}", "\u{1F91F}", "\u{1F918}",
      "\u{1F919}", "\u{1F448}", "\u{1F449}", "\u{1F446}", "\u{1F595}", "\u{1F447}",
      "\u261D\uFE0F", "\u{1F4A5}", "\u{1F4A6}", "\u{1F4A8}",
    ],
  },
  {
    name: "Hearts",
    emojis: [
      "\u2764\uFE0F", "\u{1F9E1}", "\u{1F49B}", "\u{1F49A}", "\u{1F499}", "\u{1F49C}",
      "\u{1F5A4}", "\u{1FA76}", "\u{1F90D}", "\u{1F90E}", "\u{1F494}", "\u2763\uFE0F",
      "\u{1F495}", "\u{1F49E}", "\u{1F493}", "\u{1F497}", "\u{1F496}", "\u{1F498}",
      "\u{1F49D}", "\u{1F49F}", "\u{1F48B}", "\u{1F48C}",
    ],
  },
  {
    name: "Objects",
    emojis: [
      "\u{1F389}", "\u{1F388}", "\u{1F381}", "\u{1F380}", "\u{1F386}", "\u{1F387}",
      "\u{1F3C6}", "\u{1F3C5}", "\u{1F947}", "\u{1F948}", "\u{1F949}", "\u26BD",
      "\u{1F3B5}", "\u{1F3B6}", "\u{1F3A4}", "\u{1F3B8}", "\u{1F3B9}", "\u{1F3BB}",
      "\u{1F4F7}", "\u{1F4F8}", "\u{1F4F9}", "\u{1F4BB}", "\u{1F4F1}", "\u260E\uFE0F",
      "\u{1F4A1}", "\u{1F4B0}", "\u{1F48E}", "\u{1F527}", "\u{1F528}", "\u{1F6E0}\uFE0F",
      "\u{1F525}", "\u2B50", "\u{1F31F}", "\u{1F4AB}", "\u26A1", "\u2600\uFE0F",
      "\u{1F319}", "\u{1F308}", "\u2601\uFE0F", "\u{1F4A7}",
    ],
  },
  {
    name: "Food",
    emojis: [
      "\u{1F34E}", "\u{1F34A}", "\u{1F34B}", "\u{1F34C}", "\u{1F349}", "\u{1F347}",
      "\u{1F353}", "\u{1F348}", "\u{1F352}", "\u{1F351}", "\u{1F34D}", "\u{1F965}",
      "\u{1F951}", "\u{1F346}", "\u{1F955}", "\u{1F33D}", "\u{1F336}\uFE0F", "\u{1F952}",
      "\u{1F35E}", "\u{1F950}", "\u{1F956}", "\u{1F968}", "\u{1F354}", "\u{1F35F}",
      "\u{1F355}", "\u{1F32D}", "\u{1F32E}", "\u{1F32F}", "\u{1F959}", "\u{1F9C6}",
      "\u{1F370}", "\u{1F382}", "\u{1F36B}", "\u{1F36C}", "\u{1F36D}", "\u{1F36E}",
      "\u2615", "\u{1F375}", "\u{1F37A}", "\u{1F37B}",
    ],
  },
  {
    name: "Animals",
    emojis: [
      "\u{1F436}", "\u{1F431}", "\u{1F42D}", "\u{1F439}", "\u{1F430}", "\u{1F98A}",
      "\u{1F43B}", "\u{1F43C}", "\u{1F428}", "\u{1F42F}", "\u{1F981}", "\u{1F42E}",
      "\u{1F437}", "\u{1F438}", "\u{1F435}", "\u{1F648}", "\u{1F649}", "\u{1F64A}",
      "\u{1F414}", "\u{1F427}", "\u{1F426}", "\u{1F985}", "\u{1F98B}", "\u{1F41B}",
      "\u{1F41D}", "\u{1F422}", "\u{1F40D}", "\u{1F433}", "\u{1F42C}", "\u{1F420}",
    ],
  },
];

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(0);

  const filteredCategories = useMemo(() => {
    if (!search) return EMOJI_CATEGORIES;
    // Simple filter: show all emojis in a single "Results" category
    const allEmojis = EMOJI_CATEGORIES.flatMap((c) => c.emojis);
    // For emoji search we can't really text-match, so just show all when searching
    // In practice you'd want an emoji name database, but this keeps it simple
    return [{ name: "All", emojis: allEmojis }];
  }, [search]);

  return (
    <div className="flex h-80 w-72 flex-col overflow-hidden rounded-lg bg-bg-floating shadow-xl">
      {/* Search */}
      <div className="p-2">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setActiveCategory(0);
          }}
          placeholder="Search emoji..."
          className="w-full rounded bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none placeholder:text-text-muted"
          autoFocus
        />
      </div>

      {/* Category tabs */}
      {!search && (
        <div className="flex gap-1 border-b border-bg-active px-2 pb-1">
          {EMOJI_CATEGORIES.map((cat, i) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(i)}
              className={`rounded px-1.5 py-0.5 text-xs transition-colors ${
                activeCategory === i
                  ? "bg-bg-active text-text-primary"
                  : "text-text-muted hover:text-text-primary"
              }`}
              title={cat.name}
            >
              {cat.emojis[0]}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className="flex-1 overflow-y-auto p-2">
        {(search ? filteredCategories : [filteredCategories[activeCategory]]).map(
          (cat) => (
            <div key={cat.name}>
              <p className="mb-1 px-1 text-xs font-semibold uppercase text-text-muted">
                {cat.name}
              </p>
              <div className="grid grid-cols-8 gap-0.5">
                {cat.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onSelect(emoji);
                      onClose();
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded text-lg hover:bg-bg-hover"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
