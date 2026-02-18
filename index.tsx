import React, { useState, useEffect, useRef, useMemo } from "react";
import { createRoot } from "react-dom/client";
import html2canvas from "html2canvas";

// --- Types ---

interface Dimensions {
  career: number;
  wealth: number;
  relationship: number;
  health: number;
  environment: number;
}

interface BaziResult {
  bazi: {
    year: string;
    month: string;
    day: string;
    hour: string;
  };
  profile: {
    archetype: string; 
    wuxing: string; 
    keywords: string; 
    luckyColor: string;
    luckyNumber: string;
    luckyDirection: string;
    advice: string; 
  };
  recommendations: Array<{
    city: string;
    province: string;
    tags: string[]; 
    reason: string; 
    score: number;
    distance: number;
    dimensions: Dimensions;
  }>;
}

// --- Constants ---

const CHINA_CITY_DATA: Record<string, string[]> = {
  "北京市": ["北京市"],
  "天津市": ["天津市"],
  "河北省": ["石家庄", "唐山", "秦皇岛", "邯郸", "邢台", "保定", "张家口", "承德", "沧州", "廊坊", "衡水"],
  "山西省": ["太原", "大同", "阳泉", "长治", "晋城", "朔州", "晋中", "运城", "忻州", "临汾", "吕梁"],
  "内蒙古自治区": ["呼和浩特", "包头", "乌海", "赤峰", "通辽", "鄂尔多斯", "呼伦贝尔", "巴彦淖尔", "乌兰察布"],
  "辽宁省": ["沈阳", "大连", "鞍山", "抚顺", "本溪", "丹东", "锦州", "营口", "阜新", "辽阳", "盘锦", "铁岭", "朝阳", "葫芦岛"],
  "吉林省": ["长春", "吉林", "四平", "辽源", "通化", "白山", "松原", "白城", "延边"],
  "黑龙江省": ["哈尔滨", "齐齐哈尔", "鸡西", "鹤岗", "双鸭山", "大庆", "伊春", "佳木斯", "七台河", "牡丹江", "黑河", "绥化", "大兴安岭"],
  "上海市": ["上海市"],
  "江苏省": ["南京", "无锡", "徐州", "常州", "苏州", "南通", "连云港", "淮安", "盐城", "扬州", "镇江", "泰州", "宿迁"],
  "浙江省": ["杭州", "宁波", "温州", "嘉兴", "湖州", "绍兴", "金华", "衢州", "舟山", "台州", "丽水"],
  "安徽省": ["合肥", "芜湖", "蚌埠", "淮南", "马鞍山", "淮北", "铜陵", "安庆", "黄山", "滁州", "阜阳", "宿州", "六安", "亳州", "池州", "宣城"],
  "福建省": ["福州", "厦门", "莆田", "三明", "泉州", "漳州", "南平", "龙岩", "宁德"],
  "江西省": ["南昌", "景德镇", "萍乡", "九江", "新余", "鹰潭", "赣州", "吉安", "宜春", "抚州", "上饶"],
  "山东省": ["济南", "青岛", "淄博", "枣庄", "东营", "烟台", "潍坊", "济宁", "泰安", "威海", "日照", "临沂", "德州", "聊城", "滨州", "菏泽"],
  "河南省": ["郑州", "开封", "洛阳", "平顶山", "安阳", "鹤壁", "新乡", "焦作", "濮阳", "许昌", "漯河", "三门峡", "南阳", "商丘", "信阳", "周口", "驻马店"],
  "湖北省": ["武汉", "黄石", "十堰", "宜昌", "襄阳", "鄂州", "荆门", "孝感", "荆州", "黄冈", "咸宁", "随州", "恩施"],
  "湖南省": ["长沙", "株洲", "湘潭", "衡阳", "邵阳", "岳阳", "常德", "张家界", "益阳", "郴州", "永州", "怀化", "娄底", "湘西"],
  "广东省": ["广州", "韶关", "深圳", "珠海", "汕头", "佛山", "江门", "湛江", "茂名", "肇庆", "惠州", "梅州", "汕尾", "河源", "阳江", "清远", "东莞", "中山", "潮州", "揭阳", "云浮"],
  "广西壮族自治区": ["南宁", "柳州", "桂林", "梧州", "北海", "防城港", "钦州", "贵港", "玉林", "百色", "贺州", "河池", "来宾", "崇左"],
  "海南省": ["海口", "三亚", "三沙", "儋州"],
  "重庆市": ["重庆市"],
  "四川省": ["成都", "自贡", "攀枝花", "泸州", "德阳", "绵阳", "广元", "遂宁", "内江", "乐山", "南充", "眉山", "宜宾", "广安", "达州", "雅安", "巴中", "资阳", "阿坝", "甘孜", "凉山"],
  "贵州省": ["贵阳", "六盘水", "遵义", "安顺", "毕节", "铜仁", "黔西南", "黔东南", "黔南"],
  "云南省": ["昆明", "曲靖", "玉溪", "保山", "昭通", "丽江", "普洱", "临沧", "楚雄", "红河", "文山", "西双版纳", "大理", "德宏", "怒江", "迪庆"],
  "西藏自治区": ["拉萨", "日喀则", "昌都", "林芝", "山南", "那曲", "阿里"],
  "陕西省": ["西安", "铜川", "宝鸡", "咸阳", "渭南", "延安", "汉中", "榆林", "安康", "商洛"],
  "甘肃省": ["兰州", "嘉峪关", "金昌", "白银", "天水", "武威", "张掖", "平凉", "酒泉", "庆阳", "定西", "陇南", "临夏", "甘南"],
  "青海省": ["西宁", "海东", "海北", "黄南", "海南", "果洛", "玉树", "海西"],
  "宁夏回族自治区": ["银川", "石嘴山", "吴忠", "固原", "中卫"],
  "新疆维吾尔自治区": ["乌鲁木齐", "克拉玛依", "吐鲁番", "哈密", "昌吉", "博尔塔拉", "巴音郭楞", "阿克苏", "克孜勒苏", "喀什", "和田", "伊犁", "塔城", "阿勒泰"],
  "香港特别行政区": ["香港"],
  "澳门特别行政区": ["澳门"],
  "台湾省": ["台北", "高雄", "台南", "台中", "桃园", "基隆", "新竹", "嘉义"]
};

const PROVINCES = Object.keys(CHINA_CITY_DATA);

// --- Demo Data (Merchant Tool) ---
const DEMO_RESULT: BaziResult = {
    bazi: { year: "1998", month: "8", day: "15", hour: "14:00" },
    profile: {
        wuxing: "🔥",
        archetype: "山头火 · 璀璨",
        keywords: "天生领袖 / 财运亨通 / 桃花旺盛",
        luckyColor: "赤红",
        luckyNumber: "9",
        luckyDirection: "正南",
        advice: "2025年火运当头，向南发展可遇贵人，切忌犹豫。"
    },
    recommendations: [
        {
            city: "深圳市",
            province: "广东省",
            tags: ["搞钱圣地", "贵人多"],
            reason: "南方火旺之地，完美契合您的命理喜用神。鹏城节奏快，利于您发挥领导才能，财运爆发力极强，是未来十年最佳发展地。",
            score: 98,
            distance: 1200,
            dimensions: { career: 95, wealth: 98, relationship: 80, health: 85, environment: 88 }
        },
        {
            city: "成都市",
            province: "四川省",
            tags: ["安逸富足", "桃花旺"],
            reason: "作为天府之国，水木相涵，能滋养您的火性。此处生活不仅能积累财富，更能遇到命定正缘。",
            score: 92,
            distance: 800,
            dimensions: { career: 85, wealth: 88, relationship: 96, health: 90, environment: 95 }
        },
        {
            city: "杭州市",
            province: "浙江省",
            tags: ["电商之都", "文昌位"],
            reason: "东方木旺，木能生火。杭州的互联网基因能极大放大您的创造力，是实现阶层跨越的福地。",
            score: 89,
            distance: 600,
            dimensions: { career: 90, wealth: 92, relationship: 85, health: 80, environment: 90 }
        }
    ]
};

// --- Configuration ---

// 配置你的购买链接 (小红书主页链接、置顶笔记链接，或发卡平台链接)
const BUY_LINK = "https://www.xiaohongshu.com"; 

// 配置 Base64 编码的解锁码 (固定码模式)
// 这里默认是 '8888' 的 Base64 编码 (ODg4OA==)
const VALID_CODES_HASHES = [
    'ODg4OA==', // 对应明文: 8888
];

// --- Wheel Picker Components ---

const ITEM_HEIGHT = 40;

interface PickerColumnProps {
  items: (number | string)[];
  value: number | string;
  onChange: (val: number | string) => void;
  label?: string;
  className?: string;
}

const PickerColumn: React.FC<PickerColumnProps> = ({ items, value, onChange, label, className = "" }) => {
  const scrollRef = useRef<HTMLUListElement>(null);
  const isScrolling = useRef(false);
  const timer = useRef<any>(null);

  // Initial scroll to value
  useEffect(() => {
    if (scrollRef.current) {
      const index = items.indexOf(value);
      if (index !== -1) {
        scrollRef.current.scrollTop = index * ITEM_HEIGHT;
      }
    }
  }, []); // Run once on mount

  // Sync scroll if value changes externally (and not currently scrolling by user)
  useEffect(() => {
    if (scrollRef.current && !isScrolling.current) {
      const index = items.indexOf(value);
      if (index !== -1 && Math.abs(scrollRef.current.scrollTop - index * ITEM_HEIGHT) > 5) {
        scrollRef.current.scrollTo({
          top: index * ITEM_HEIGHT,
          behavior: 'smooth'
        });
      }
    }
  }, [value, items]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    isScrolling.current = true;
    
    // Clear debounce timer
    if (timer.current) clearTimeout(timer.current);

    const scrollTop = scrollRef.current.scrollTop;
    const index = Math.round(scrollTop / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
    const newValue = items[clampedIndex];

    // Only trigger change if meaningful change
    if (newValue !== value) {
        onChange(newValue);
    }

    // Reset scrolling flag after motion stops
    timer.current = setTimeout(() => {
      isScrolling.current = false;
    }, 150);
  };

  return (
    <div className={`relative h-[140px] w-full max-w-[140px] text-center overflow-hidden flex-1 ${className}`}>
      {/* Selection Highlight - Top at 50px (Center 70 - 20) */}
      <div className="absolute top-[50px] left-0 right-0 h-[40px] border-t border-b border-red-800/30 z-10 pointer-events-none bg-red-50/10"></div>
      
      {/* Scroll Container */}
      <ul
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide py-[50px]"
        style={{ scrollBehavior: 'auto' }} // auto for drag, custom smooth for programmatic
      >
        {items.map((item) => (
          <li
            key={item}
            className={`h-[40px] flex items-center justify-center snap-center text-base transition-all duration-200 cursor-pointer select-none truncate px-1
              ${item === value ? "text-red-900 font-bold scale-110" : "text-gray-400 scale-100"}`}
            onClick={() => {
                onChange(item);
                const idx = items.indexOf(item);
                scrollRef.current?.scrollTo({ top: idx * ITEM_HEIGHT, behavior: 'smooth' });
            }}
          >
            {item}
            {label && <span className="text-[10px] ml-0.5 font-normal opacity-50">{label}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
};

const IOSDatePicker = ({
  onChange,
}: {
  onChange: (date: string, time: string) => void;
}) => {
  const currentYear = new Date().getFullYear();
  
  // States
  const [year, setYear] = useState(2000);
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(1);
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);

  // Generators
  const years = useMemo(() => Array.from({ length: 130 }, (_, i) => 1900 + i), []);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);
  
  // Dynamic Days based on Year/Month
  const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month]);
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

  // Adjust day if month changes and day is out of range
  useEffect(() => {
    if (day > daysInMonth) {
      setDay(daysInMonth);
    }
  }, [daysInMonth, day]);

  // Propagate changes
  useEffect(() => {
    // Format YYYY-MM-DD
    const yStr = year.toString();
    const mStr = month.toString().padStart(2, '0');
    const dStr = day.toString().padStart(2, '0');
    const dateStr = `${yStr}-${mStr}-${dStr}`;

    // Format HH:MM
    const hStr = hour.toString().padStart(2, '0');
    const minStr = minute.toString().padStart(2, '0');
    const timeStr = `${hStr}:${minStr}`;

    onChange(dateStr, timeStr);
  }, [year, month, day, hour, minute, onChange]);

  return (
    <div className="bg-white/40 backdrop-blur-sm rounded-xl border border-stone-200 overflow-hidden shadow-inner w-full">
        <div className="flex justify-center items-center relative px-0 md:px-4 py-0">
            {/* Gradient Masks for 3D effect */}
            <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white via-white/80 to-transparent z-20 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white via-white/80 to-transparent z-20 pointer-events-none"></div>

            <PickerColumn items={years} value={year} onChange={(v) => setYear(Number(v))} label="年" />
            <PickerColumn items={months} value={month} onChange={(v) => setMonth(Number(v))} label="月" />
            <PickerColumn items={days} value={day} onChange={(v) => setDay(Number(v))} label="日" />
            
            {/* Divider - Hidden on small mobile to save space, shown on larger */}
            <div className="w-px h-[60px] bg-gray-300 mx-0.5 hidden sm:block"></div>
            
            <PickerColumn items={hours} value={hour} onChange={(v) => setHour(Number(v))} label="时" />
            <PickerColumn items={minutes} value={minute} onChange={(v) => setMinute(Number(v))} label="分" />
        </div>
    </div>
  );
};

const CityPicker = ({
  onChange,
}: {
  onChange: (city: string) => void;
}) => {
  const [province, setProvince] = useState(PROVINCES[0]);
  const [city, setCity] = useState(CHINA_CITY_DATA[PROVINCES[0]][0]);

  // When province changes, reset city to the first city of that province
  useEffect(() => {
    const cities = CHINA_CITY_DATA[province];
    if (cities && !cities.includes(city)) {
        setCity(cities[0]);
    }
  }, [province]);

  // Propagate changes
  useEffect(() => {
    onChange(`${province} ${city}`);
  }, [province, city, onChange]);

  const currentCities = useMemo(() => CHINA_CITY_DATA[province] || [], [province]);

  return (
    <div className="bg-white/40 backdrop-blur-sm rounded-xl border border-stone-200 overflow-hidden shadow-inner w-full">
        <div className="flex justify-center items-center relative px-2 md:px-4 py-0">
            {/* Gradient Masks */}
            <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white via-white/80 to-transparent z-20 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white via-white/80 to-transparent z-20 pointer-events-none"></div>

            <PickerColumn 
                items={PROVINCES} 
                value={province} 
                onChange={(v) => setProvince(String(v))} 
                className="min-w-[40%]"
            />
            <PickerColumn 
                items={currentCities} 
                value={city} 
                onChange={(v) => setCity(String(v))} 
                className="min-w-[40%]"
            />
        </div>
    </div>
  );
};

// --- Radar Chart Component ---

const RadarChart = ({ data }: { data: Dimensions }) => {
  if (!data) return null;

  // Config - MADE SMALLER
  const size = 120; // Reduced from 160 for commercial look
  const center = size / 2;
  const radius = 40; // Reduced
  const levels = 3; // Grid levels simplified
  const labels = ["事业", "财运", "感情", "健康", "环境"];
  const keys = ["career", "wealth", "relationship", "health", "environment"] as const;
  
  // Helpers
  const angleSlice = (Math.PI * 2) / 5;
  const getXY = (value: number, index: number) => {
    const angle = index * angleSlice - Math.PI / 2;
    const r = (value / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle)
    };
  };

  // Build polygon points
  const points = keys.map((key, i) => {
    const { x, y } = getXY(data[key], i);
    return `${x},${y}`;
  }).join(" ");

  // Build grid
  const grid = [];
  for (let i = 1; i <= levels; i++) {
    const levelRadius = (radius / levels) * i;
    const levelPoints = [];
    for (let j = 0; j < 5; j++) {
       const angle = j * angleSlice - Math.PI / 2;
       levelPoints.push(
         `${center + levelRadius * Math.cos(angle)},${center + levelRadius * Math.sin(angle)}`
       );
    }
    grid.push(levelPoints.join(" "));
  }

  // Build axes & Labels
  const axes = [];
  const labelEls = [];
  for (let i = 0; i < 5; i++) {
    const { x, y } = getXY(100, i);
    axes.push({ x1: center, y1: center, x2: x, y2: y });
    
    // Label pos (slightly further out)
    const angle = i * angleSlice - Math.PI / 2;
    const labelRadius = radius + 12; // Reduced offset
    labelEls.push({
      x: center + labelRadius * Math.cos(angle),
      y: center + labelRadius * Math.sin(angle),
      text: labels[i]
    });
  }

  return (
    <div className="flex justify-center items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
         {/* Grid Background */}
         {grid.map((pts, i) => (
           <polygon key={i} points={pts} fill="none" stroke="#e5e7eb" strokeWidth="1" />
         ))}
         {/* Axes */}
         {axes.map((axis, i) => (
           <line key={i} x1={axis.x1} y1={axis.y1} x2={axis.x2} y2={axis.y2} stroke="#e5e7eb" strokeWidth="1" />
         ))}
         
         {/* Data Area */}
         <polygon points={points} fill="rgba(185, 28, 28, 0.2)" stroke="#b91c1c" strokeWidth="1.5" />
         
         {/* Data Points */}
         {keys.map((key, i) => {
             const {x, y} = getXY(data[key], i);
             return <circle key={i} cx={x} cy={y} r="2" fill="#b91c1c" />;
         })}

         {/* Labels */}
         {labelEls.map((l, i) => (
           <text key={i} x={l.x} y={l.y} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="#888" className="font-sans">
             {l.text}
           </text>
         ))}
      </svg>
    </div>
  );
};

// --- Helper Components ---

const Toast = ({ message, show, onClose }: { message: string, show: boolean, onClose: () => void }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-6 py-3 rounded-lg shadow-2xl z-[60] animate-[fadeIn_0.3s_ease-out] text-sm backdrop-blur-sm whitespace-nowrap">
      {message}
    </div>
  );
}

// --- Share Poster Component (Hidden from normal view) ---
const SharePoster = React.forwardRef<HTMLDivElement, { result: BaziResult }>(({ result }, ref) => {
    const topCity = result.recommendations[0];
    
    return (
        <div ref={ref} className="bg-[#fdfbf7] w-[375px] h-[667px] p-6 flex flex-col items-center justify-between relative overflow-hidden text-gray-800">
            {/* Background Texture & Decoration */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #b91c1c 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            <div className="absolute top-0 right-0 w-48 h-48 bg-red-800/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl -ml-10 -mb-10"></div>
            
            {/* Header */}
            <div className="text-center w-full z-10 pt-4">
                <h1 className="text-3xl font-serif font-bold tracking-[0.2em] text-red-900 mb-2">命理择城</h1>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest border-t border-b border-gray-200 py-1 inline-block px-4">
                    Exclusive Report • {new Date().toLocaleDateString()}
                </p>
            </div>

            {/* Core Content Card */}
            <div className="w-full bg-white border border-stone-200 shadow-xl rounded-xl p-6 relative z-10 flex flex-col items-center text-center">
                 <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-red-900 text-white text-[10px] px-3 py-1 rounded-full">
                    {result.bazi.year}年生人
                 </div>

                 <div className="mt-4 mb-4">
                    <span className="text-sm text-gray-500 block mb-1">您的命定标签</span>
                    <h2 className="text-3xl font-bold text-gray-800">{result.profile.archetype}</h2>
                 </div>

                 <div className="w-full h-px bg-stone-100 my-2"></div>

                 <div className="my-2 w-full">
                    <span className="text-xs text-gray-400">第一推荐福地</span>
                    <div className="flex items-end justify-center gap-2 mt-1">
                        <h3 className="text-4xl font-bold text-red-800">{topCity.city}</h3>
                        <span className="text-lg text-gray-400 pb-1">{topCity.score}%</span>
                    </div>
                 </div>
                 
                 <div className="bg-stone-50 p-3 rounded-lg w-full mt-3 text-justify">
                    <p className="text-xs text-gray-600 leading-relaxed">
                        {topCity.reason.length > 55 ? topCity.reason.substring(0, 52) + "..." : topCity.reason}
                    </p>
                 </div>

                 <div className="flex justify-between w-full mt-4 pt-4 border-t border-dashed border-stone-200">
                    <div className="text-center w-1/3">
                        <p className="text-[10px] text-gray-400">幸运色</p>
                        <p className="font-bold text-sm">{result.profile.luckyColor}</p>
                    </div>
                    <div className="text-center w-1/3 border-l border-stone-100">
                        <p className="text-[10px] text-gray-400">幸运数</p>
                        <p className="font-bold text-sm">{result.profile.luckyNumber}</p>
                    </div>
                    <div className="text-center w-1/3 border-l border-stone-100">
                        <p className="text-[10px] text-gray-400">方位</p>
                        <p className="font-bold text-sm">{result.profile.luckyDirection}</p>
                    </div>
                 </div>
            </div>

            {/* Footer / CTA */}
            <div className="w-full text-center z-10 pb-4">
                <div className="flex justify-center mb-3">
                   {/* Mock QR Code */}
                   <div className="w-16 h-16 bg-white border border-gray-200 p-1 rounded-lg">
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center text-[8px] text-white text-center leading-none">
                          扫码<br/>解锁<br/>全盘
                      </div>
                   </div>
                </div>
                <p className="text-sm font-bold text-gray-800">关注「命理择城」</p>
                <p className="text-[10px] text-gray-500 mt-1">领取您的2025年专属转运指南</p>
            </div>
        </div>
    );
});


// --- Main Components ---

const Header = ({ compact = false }: { compact?: boolean }) => (
  <header className={`text-center transition-all duration-300 ${compact ? 'py-3 px-4 border-b border-stone-200 bg-white/50 backdrop-blur-sm sticky top-0 z-50' : 'py-6 px-4'}`}>
    <h1 className={`${compact ? 'text-xl' : 'text-3xl md:text-4xl'} font-bold text-gray-800 tracking-wider font-serif`}>
      {compact ? '我的运势报告' : '命理择城'}
    </h1>
    {!compact && (
      <p className="text-gray-500 font-normal text-xs mt-2 tracking-widest uppercase">
        FIND YOUR LUCKY CITY
      </p>
    )}
  </header>
);

// --- Unlocked Result View ---
const UnlockedResultView = ({ result, onGeneratePoster, onRetest }: { result: BaziResult, onGeneratePoster: () => void, onRetest: () => void }) => {
    return (
        <div className="max-w-xl mx-auto px-4 pt-4 space-y-5">
            {/* 1. Profile Card (Commercial & Visual) */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-500/10 rounded-full -ml-10 -mb-10 blur-xl"></div>

                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <span className="text-xs font-mono text-gray-400 border border-gray-600 px-2 py-0.5 rounded-full mb-2 inline-block bg-black/20">
                            {result.bazi.year}年 • {result.bazi.month} • {result.bazi.day}
                        </span>
                        <h2 className="text-3xl font-bold mt-1 mb-1">{result.profile.archetype}</h2>
                        <p className="text-gray-300 text-sm font-light">{result.profile.keywords}</p>
                    </div>
                    <div className="text-4xl font-serif opacity-20 font-bold border-2 border-white/20 w-16 h-16 rounded-full flex items-center justify-center">
                        {result.profile.wuxing}
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-2 text-center bg-white/5 rounded-xl p-3 border border-white/10 backdrop-blur-sm">
                    <div>
                        <p className="text-[10px] text-gray-400 mb-1">幸运色</p>
                        <p className="text-sm font-bold text-yellow-100">{result.profile.luckyColor}</p>
                    </div>
                    <div className="border-l border-white/10">
                        <p className="text-[10px] text-gray-400 mb-1">幸运数</p>
                        <p className="text-sm font-bold text-yellow-100">{result.profile.luckyNumber}</p>
                    </div>
                    <div className="border-l border-white/10">
                        <p className="text-[10px] text-gray-400 mb-1">吉利方位</p>
                        <p className="text-sm font-bold text-yellow-100">{result.profile.luckyDirection}</p>
                    </div>
                </div>
                
                <div className="mt-4 flex items-start gap-2 bg-yellow-900/30 p-2 rounded-lg border border-yellow-700/30">
                    <span className="text-lg">💡</span>
                    <p className="text-xs text-yellow-100/90 leading-relaxed pt-1">{result.profile.advice}</p>
                </div>
            </div>

            {/* 2. Recommendations Header */}
            <div className="flex items-center justify-between px-1 mt-2">
                <h3 className="text-lg font-bold text-gray-800">
                    为您推荐 <span className="text-red-600">3座</span> 宝藏城市
                </h3>
                <span className="text-[10px] text-gray-400 bg-white px-2 py-1 rounded-full shadow-sm">
                    按五行契合度排序
                </span>
            </div>

            {/* 3. City Cards */}
            <div className="space-y-3">
                {result.recommendations.map((rec, idx) => (
                    <RecommendationCard key={idx} rec={rec} index={idx} />
                ))}
            </div>

            {/* Disclaimer */}
            <p className="text-center text-[10px] text-gray-300 py-4">
                * 结果仅供娱乐参考，命运掌握在自己手中
            </p>
            
            {/* Floating Action Buttons */}
            <div className="fixed bottom-6 left-0 right-0 px-6 flex gap-3 justify-center z-40 max-w-xl mx-auto">
                <button
                    onClick={onGeneratePoster}
                    className="flex-1 bg-red-900 text-white border border-red-800 px-4 py-3.5 rounded-xl shadow-2xl font-bold tracking-wide hover:bg-red-950 transition-all flex items-center justify-center text-sm"
                >
                    <span className="mr-2">🧧</span> 生成好运签
                </button>
                <button
                    onClick={onRetest}
                    className="w-14 h-14 bg-white text-gray-800 border border-gray-200 rounded-xl shadow-lg hover:bg-gray-50 flex items-center justify-center transition-colors"
                    aria-label="重测"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                </button>
            </div>
        </div>
    )
}

// --- Locked Result View (Paywall) ---
const LockedResultView = ({ result, onUnlock }: { result: BaziResult, onUnlock: (code: string) => void }) => {
    const [code, setCode] = useState("");
    const [isShaking, setIsShaking] = useState(false);

    const handleUnlockClick = () => {
        if (!code) {
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
            return;
        }
        onUnlock(code);
    };

    const handleBuyClick = () => {
        window.open(BUY_LINK, '_blank');
    };

    return (
        <div className="max-w-xl mx-auto px-4 pt-4 space-y-5 pb-20">
             {/* 1. Teaser Profile Card */}
             <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-mono text-gray-400 border border-gray-600 px-2 py-0.5 rounded-full inline-block bg-black/20">
                            已完成测算
                        </span>
                        <span className="text-red-400 text-xs font-bold animate-pulse">● 待解锁</span>
                    </div>
                    <div className="text-center py-6">
                        <p className="text-gray-400 text-sm mb-1">您的核心五行意象</p>
                        <h2 className="text-4xl font-bold mb-2 text-white">{result.profile.archetype}</h2>
                        <p className="text-gray-500 text-xs">具体性格关键词与转运建议已被锁定...</p>
                    </div>
                </div>
             </div>

             {/* 2. Locked Content Preview */}
             <div className="relative">
                 {/* Blurry Background Layer representing the value */}
                 <div className="space-y-3 filter blur-md select-none pointer-events-none opacity-60">
                     <div className="bg-white p-4 rounded-xl h-32 w-full"></div>
                     <div className="bg-white p-4 rounded-xl h-32 w-full"></div>
                     <div className="bg-white p-4 rounded-xl h-32 w-full"></div>
                 </div>

                 {/* Lock Overlay */}
                 <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                     <div className="bg-white/90 backdrop-blur-md border border-red-100 p-6 rounded-2xl shadow-2xl w-[90%] text-center">
                         <div className="absolute -top-3 right-4 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-bounce">
                             限时特惠 🔥
                         </div>
                         <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <svg className="w-6 h-6 text-red-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                         </div>
                         <h3 className="text-lg font-bold text-gray-800 mb-1">解锁完整报告</h3>
                         <p className="text-xs text-gray-500 mb-4 px-2">
                             已为您精准测算出 <span className="text-red-600 font-bold">3个转运城市</span><br/>
                             包含事业/财运/感情全维度评分
                         </p>

                         {/* Input Area */}
                         <div className={`relative mb-4 transition-transform ${isShaking ? 'translate-x-[-5px]' : ''}`}>
                             <input 
                                type="text" 
                                value={code}
                                onChange={(e) => setCode(e.target.value.trim())}
                                placeholder="请输入解锁码"
                                className="w-full bg-stone-50 border border-stone-200 rounded-lg py-3 px-4 text-center text-sm focus:outline-none focus:border-red-800 transition-colors uppercase"
                             />
                         </div>

                         <div className="flex flex-col gap-2 mb-3">
                            <button 
                                onClick={handleUnlockClick}
                                className="w-full bg-red-900 text-white font-bold py-3 rounded-lg shadow-lg hover:bg-red-950 transition-colors text-sm"
                            >
                                立即解锁
                            </button>
                            <button
                                onClick={handleBuyClick}
                                className="w-full bg-gradient-to-r from-orange-100 to-amber-100 text-orange-900 font-bold py-3 rounded-lg hover:from-orange-200 hover:to-amber-200 transition-all text-sm flex items-center justify-center gap-1 border border-orange-200"
                            >
                                <span>🔑</span> 获取解锁码 (去下单)
                            </button>
                         </div>
                         
                         <p className="text-[10px] text-gray-400">
                            点击上方黄色按钮，付款后<br/>私信自动发送解锁码
                         </p>
                     </div>
                 </div>
             </div>
        </div>
    );
};

const RecommendationCard: React.FC<{
  rec: BaziResult["recommendations"][0];
  index: number;
}> = ({
  rec,
  index,
}) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-100 relative overflow-hidden group">
    {/* Decoration */}
    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-red-50 to-transparent rounded-bl-full -z-0"></div>
    
    <div className="flex items-start justify-between relative z-10">
      <div className="flex-1">
         <div className="flex items-center gap-2 mb-1">
             <h3 className="text-xl font-bold text-gray-800">{rec.city}</h3>
             <span className="text-xs text-gray-400 font-light">{rec.province}</span>
         </div>
         
         {/* Tags */}
         <div className="flex flex-wrap gap-1 mb-2">
             {rec.tags.map((tag, i) => (
                 <span key={i} className="px-1.5 py-0.5 bg-orange-50 text-orange-700 text-[10px] rounded-md border border-orange-100">
                     {tag}
                 </span>
             ))}
         </div>

         <p className="text-sm text-gray-600 leading-snug pr-2 text-justify line-clamp-3">
             {rec.reason}
         </p>
         
         <div className="mt-3 flex items-center text-[10px] text-gray-400 space-x-3">
             <span>🚀 {rec.distance} km</span>
             <span>🧭 方位: {rec.dimensions.environment > 80 ? '极佳' : '适宜'}</span>
         </div>
      </div>

      <div className="flex flex-col items-center pl-2 border-l border-dashed border-gray-100">
         <div className="relative flex items-center justify-center w-12 h-12 rounded-full border-2 border-red-100 mb-1">
             <span className="text-lg font-bold text-red-600">{rec.score}</span>
             <span className="text-[8px] absolute bottom-1.5 text-red-300">%</span>
         </div>
         <RadarChart data={rec.dimensions} />
      </div>
    </div>
  </div>
);

const LoadingView = ({error, onErrorClose}: {error: string | null, onErrorClose: () => void}) => {
    const [text, setText] = useState("正在推算天干地支...");
    
    useEffect(() => {
        if (error) return; // Stop text rotation on error

        const texts = [
            "正在连接命理数据库...",
            "正在分析你的五行特质...",
            "正在计算流年运势...",
            "正在筛选全国转运城市...",
            "即将生成专属报告..."
        ];
        let i = 0;
        const interval = setInterval(() => {
            i = (i + 1) % texts.length;
            setText(texts[i]);
        }, 1500);
        return () => clearInterval(interval);
    }, [error]);

    return (
        <div className="fixed inset-0 bg-paper z-50 flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
            {error ? (
                <div className="max-w-xs bg-white p-6 rounded-xl shadow-xl border border-red-100">
                    <div className="w-12 h-12 bg-red-100 text-red-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">推算中断</h3>
                    <p className="text-sm text-gray-500 mb-4">{error}</p>
                    <button onClick={onErrorClose} className="w-full bg-red-900 text-white py-2 rounded-lg text-sm font-bold hover:bg-red-950">
                        返回重试
                    </button>
                </div>
            ) : (
                <>
                    <div className="relative mb-8">
                        <div className="w-16 h-16 border-4 border-stone-200 rounded-full animate-spin"></div>
                        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-t-red-800 rounded-full animate-spin"></div>
                    </div>
                    <h2 className="text-lg font-bold text-gray-800 mb-2 font-serif">{text}</h2>
                </>
            )}
        </div>
    );
}

const App = () => {
  const [view, setView] = useState<'input' | 'calculating' | 'result'>('input');
  const [formData, setFormData] = useState({
    birthDate: "", 
    birthTime: "",
    birthPlace: "",
  });
  const [result, setResult] = useState<BaziResult | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false); // New State: Locked Status
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{show: boolean, message: string}>({show: false, message: ''});
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const posterRef = useRef<HTMLDivElement>(null);

  // --- Merchant Demo Mode Logic ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === 'true') {
        console.log("Entering Merchant Demo Mode");
        setResult(DEMO_RESULT);
        setView('result');
        // If 'locked=true' param is present, show locked view for promo screenshots
        if (params.get('locked') === 'true') {
            setIsUnlocked(false);
        } else {
            setIsUnlocked(true);
        }
    }
  }, []);

  const handleDateChange = (date: string, time: string) => {
      setFormData(prev => ({
          ...prev,
          birthDate: date,
          birthTime: time
      }));
  };

  const handleCityChange = (city: string) => {
    setFormData(prev => ({
        ...prev,
        birthPlace: city
    }));
  };

  const handleGeneratePoster = async () => {
      if (!posterRef.current) return;
      
      setToast({ show: true, message: "正在绘制您的好运签..." });
      
      try {
          // Add a small delay to ensure rendering
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const canvas = await html2canvas(posterRef.current, {
              scale: 2, // Retina quality
              useCORS: true,
              backgroundColor: '#fdfbf7',
          });
          
          const image = canvas.toDataURL("image/png");
          setGeneratedImage(image);
      } catch (err) {
          console.error(err);
          setToast({ show: true, message: "生成图片失败，请重试" });
      }
  };

  // Mock code verification with Obfuscation
  const handleUnlock = (code: string) => {
      try {
        const inputHash = btoa(code.trim().toUpperCase()); // removed uppercase requirement if you want, but sticking to previous robustness
        // Note: For '8888', it doesn't matter.
        // If code is 'vip', btoa('VIP') vs btoa('vip') differs. 
        // Let's just trim for the fixed numeric code case.
        const hash = btoa(code.trim()); 
        if (VALID_CODES_HASHES.includes(hash)) {
            setIsUnlocked(true);
            setToast({ show: true, message: "解锁成功！天机已显现 ✨" });
        } else {
            setToast({ show: true, message: "解锁码无效，请检查输入" });
        }
      } catch (e) {
         setToast({ show: true, message: "解锁码无效" });
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setView('calculating');
    setError(null);
    setResult(null);
    setIsUnlocked(false); // Reset unlock status on new submission
    setGeneratedImage(null);

    try {
      // Call the Serverless Function instead of the direct Google API
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      // Check if response is HTML (common in local Vite dev when API doesn't exist)
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") === -1) {
          console.warn("API returned non-JSON content. Likely running in local Vite dev mode without backend. Falling back to Demo Data.");
          // Simulate network delay
          await new Promise(resolve => setTimeout(resolve, 2000));
          setResult(DEMO_RESULT);
          setView('result');
          setToast({ show: true, message: "⚠️ 本地开发模式：显示演示数据" });
          return;
      }

      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "请求失败，请稍后重试");
      }

      const parsed = await response.json();
      
      if (parsed.recommendations) {
          parsed.recommendations.sort((a: any, b: any) => b.score - a.score); // Commercial: Show highest score first
      }

      setResult(parsed as BaziResult);
      setView('result');

    } catch (err: any) {
      console.error(err);
      setError(err.message || "推算过程中发生了错误，请稍后再试。");
      // Do NOT reset view to input immediately, let user see the error in LoadingView
    }
  };

  // --- Render Views ---

  if (view === 'calculating') {
      return <LoadingView error={error} onErrorClose={() => setView('input')} />;
  }

  if (view === 'result' && result) {
      return (
        <div className="min-h-screen bg-stone-50 pb-24 animate-[fadeIn_0.5s_ease-out]">
            <Header compact={true} />
            <Toast show={toast.show} message={toast.message} onClose={() => setToast({ ...toast, show: false })} />
            
            {/* Hidden Poster Element for Generation - Only render content if result exists */}
            <div className="fixed top-0 left-[-9999px] z-0">
                <SharePoster result={result} ref={posterRef} />
            </div>

            {/* Image Preview Overlay */}
            {generatedImage && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-[fadeIn_0.3s_ease-out]" onClick={() => setGeneratedImage(null)}>
                    <div className="bg-white p-2 rounded-lg shadow-2xl max-w-sm w-full relative" onClick={(e) => e.stopPropagation()}>
                        <img src={generatedImage} alt="Share Poster" className="w-full h-auto rounded-md" />
                        <div className="mt-4 flex flex-col items-center gap-2">
                            <p className="text-gray-500 text-xs">长按图片保存，分享到小红书</p>
                            <button 
                                onClick={() => setGeneratedImage(null)}
                                className="w-full py-3 rounded-lg font-bold bg-gray-100 text-gray-800 hover:bg-gray-200"
                            >
                                关闭
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Conditional Rendering based on Lock Status */}
            {isUnlocked ? (
                <UnlockedResultView 
                    result={result} 
                    onGeneratePoster={handleGeneratePoster} 
                    onRetest={() => setView('input')} 
                />
            ) : (
                <LockedResultView 
                    result={result} 
                    onUnlock={handleUnlock} 
                />
            )}
        </div>
      );
  }

  // Input View (Default)
  return (
    <div className="min-h-screen bg-stone-50 pb-10">
      <div className="max-w-xl mx-auto px-4">
        <Header />

        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-xl border border-stone-100 mb-6 mx-auto mt-2 relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-bl-full -z-0 opacity-50"></div>

          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            
            <div className="space-y-1.5">
                <label className="text-gray-800 font-bold block text-sm ml-1">出生时间</label>
                <IOSDatePicker onChange={handleDateChange} />
            </div>

            <div className="space-y-1.5">
                <label className="text-gray-800 font-bold block text-sm ml-1">出生地点</label>
                <CityPicker onChange={handleCityChange} />
            </div>
            
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl text-white font-bold text-lg tracking-wider shadow-lg shadow-red-900/20 transition-all transform hover:-translate-y-1 bg-gradient-to-r from-red-800 to-red-900 mt-2"
            >
                查看我的专属报告
            </button>
            
            <p className="text-center text-[10px] text-gray-400 mt-3">
                已有 12,403 人找到天命之城
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);