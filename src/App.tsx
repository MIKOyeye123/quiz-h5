import React, { useEffect, useState, useRef, useCallback } from 'react';
import { parseDocxQuestions } from './utils/parseDocx';
import type { ParsedQuestion } from './utils/parseDocx';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import type { User } from '@supabase/supabase-js';
import './App.css';

type View = 'home' | 'practice' | 'wrongBook' | 'import' | 'library' | 'notes' | 'search' | 'chapterProgress';

type Question = {
  id: string;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  answer: 'A' | 'B' | 'C' | 'D';
  optionExplanations: { A: string; B: string; C: string; D: string };
  chapterNo: number;
  chapterTitle?: string;
  review: {
    chapter: string;
    concept: string;
    confusionPoint: string;
    errorPronePoint: string;
  };
};

type AnswerRecord = {
  [id: string]: {
    selected: 'A' | 'B' | 'C' | 'D';
    isCorrect: boolean;
  };
};

// 刷题模式
type PracticeMode = 'sequential' | 'random';

// 进度数据
type ProgressData = {
  lastIndex: number; // 上次刷到的题目索引
  totalDone: number; // 总共做过的题数
  correctCount: number; // 正确题数
  doneQuestionIds: string[]; // 已做题目的 ID 列表（用于去重计数）
  updatedAt: number; // 更新时间
};

// 复习笔记数据结构
type ChapterNotes = {
  chapterNo: number;
  chapterTitle?: string;
  doneCount: number;
  concepts: string[];
  confusions: string[];
  errors: string[];
  updatedAt?: number;
};

type NotesData = {
  [chapterNo: number]: ChapterNotes;
};

// 默认题目数据已迁移到 Supabase，不再使用本地数据
// 如需保留作为备用，可以取消注释以下代码
/*
const DEFAULT_QUESTIONS: Question[] = [
  {
    id: '1',
    question: '在浏览器中，以下哪种方式可以输出内容到控制台？',
    options: {
      A: 'print()',
      B: 'console.log()',
      C: 'alert()',
      D: 'document.write()'
    },
    answer: 'B',
    chapterNo: 1,
    chapterTitle: 'JavaScript 基础 - 调试与输出',
    optionExplanations: {
      A: 'print() 不是浏览器 JavaScript 的标准方法，这是 Python 等语言的语法。',
      B: 'console.log() 是浏览器控制台的标准输出方法，用于调试和输出信息。',
      C: 'alert() 会弹出对话框，不是输出到控制台，而是阻塞用户交互。',
      D: 'document.write() 是写入 HTML 文档的方法，不是输出到控制台。'
    },
    review: {
      chapter: 'JavaScript 基础 - 调试与输出',
      concept: '浏览器控制台 API：console 对象的方法',
      confusionPoint: 'console.log() 与 alert()、document.write() 的区别',
      errorPronePoint: '混淆不同输出方式的使用场景，误用 print() 等非浏览器 API'
    }
  },
  {
    id: '2',
    question: 'CSS 中用于设置元素文字颜色的属性是？',
    options: {
      A: 'font-color',
      B: 'text-color',
      C: 'color',
      D: 'fontStyle'
    },
    answer: 'C',
    chapterNo: 2,
    chapterTitle: 'CSS 基础 - 文本样式',
    optionExplanations: {
      A: 'font-color 不是有效的 CSS 属性，这是常见的错误写法。',
      B: 'text-color 不是有效的 CSS 属性，CSS 中没有这个属性名。',
      C: 'color 是 CSS 中用于设置文字颜色的标准属性，例如 color: red;。',
      D: 'fontStyle 用于设置字体样式（如 italic），不是设置颜色。'
    },
    review: {
      chapter: 'CSS 基础 - 文本样式',
      concept: 'CSS color 属性的用法',
      confusionPoint: 'color 与 font-color、text-color 等错误属性的区别',
      errorPronePoint: '误用不存在的属性名，混淆 color 与 fontStyle 的作用'
    }
  },
  {
    id: '3',
    question: 'HTML 中用于创建超链接的标签是？',
    options: {
      A: '<link>',
      B: '<a>',
      C: '<href>',
      D: '<url>'
    },
    answer: 'B',
    chapterNo: 3,
    chapterTitle: 'HTML 基础 - 超链接',
    optionExplanations: {
      A: '<link> 用于链接外部资源（如 CSS），不是创建页面内的超链接。',
      B: '<a> 是 HTML 中创建超链接的标准标签，通过 href 属性指定链接地址。',
      C: '<href> 不是有效的 HTML 标签，href 是 <a> 标签的属性名。',
      D: '<url> 不是有效的 HTML 标签，URL 是链接地址的概念，不是标签。'
    },
    review: {
      chapter: 'HTML 基础 - 超链接',
      concept: '<a> 标签的用法和 href 属性',
      confusionPoint: '<a> 与 <link> 标签的区别和各自用途',
      errorPronePoint: '混淆标签名与属性名，误用不存在的标签'
    }
  },
  {
    id: '4',
    question: 'JavaScript 中，数组的长度保存在哪个属性中？',
    options: {
      A: 'size',
      B: 'length',
      C: 'count',
      D: 'items'
    },
    answer: 'B',
    chapterNo: 1,
    chapterTitle: 'JavaScript 基础 - 数组操作',
    optionExplanations: {
      A: 'size 不是数组的属性，这是其他语言（如 Java）中集合类的属性。',
      B: 'length 是 JavaScript 数组的标准属性，表示数组的当前长度，例如 arr.length。',
      C: 'count 不是数组的属性，JavaScript 数组没有这个属性。',
      D: 'items 不是数组的长度属性，这是某些框架中的概念。'
    },
    review: {
      chapter: 'JavaScript 基础 - 数组操作',
      concept: '数组 length 属性的用法和特性',
      confusionPoint: 'length 与其他语言中 size、count 等属性的区别',
      errorPronePoint: '误用其他语言的属性名，忘记 length 是属性不是方法'
    }
  },
  {
    id: '5',
    question: '下列哪一个 HTTP 方法通常用于获取数据？',
    options: {
      A: 'GET',
      B: 'POST',
      C: 'PUT',
      D: 'DELETE'
    },
    answer: 'A',
    chapterNo: 4,
    chapterTitle: 'HTTP 协议 - 请求方法',
    optionExplanations: {
      A: 'GET 方法通常用于从服务器获取数据，不会对资源进行修改，是幂等的。',
      B: 'POST 方法用于提交数据或创建资源，不是用于获取数据。',
      C: 'PUT 方法用于更新资源，不是用于获取数据。',
      D: 'DELETE 方法用于删除资源，不是用于获取数据。'
    },
    review: {
      chapter: 'HTTP 协议 - 请求方法',
      concept: 'HTTP GET 方法的特点和用途',
      confusionPoint: 'GET 与 POST、PUT、DELETE 等方法的区别',
      errorPronePoint: '混淆不同 HTTP 方法的用途，误用 POST 获取数据'
    }
  },
  {
    id: '6',
    question: '在 CSS 中，哪种单位是相对于根元素字体大小的？',
    options: {
      A: 'px',
      B: 'em',
      C: '%',
      D: 'rem'
    },
    answer: 'D',
    chapterNo: 2,
    chapterTitle: 'CSS 进阶 - 单位系统',
    optionExplanations: {
      A: 'px 是绝对单位，不随任何元素变化，不是相对于根元素的。',
      B: 'em 是相对于当前元素的字体大小，不是相对于根元素。',
      C: '% 是相对于父元素的百分比，不是相对于根元素的字体大小。',
      D: 'rem 单位是相对于根元素（通常是 html）的字体大小，适合做响应式设计。'
    },
    review: {
      chapter: 'CSS 进阶 - 单位系统',
      concept: 'rem 单位的特点和计算方式',
      confusionPoint: 'rem 与 em、px、% 的区别和各自适用场景',
      errorPronePoint: '混淆 rem 和 em，误用 px 做响应式布局'
    }
  },
  {
    id: '7',
    question: '以下哪个数组方法会返回一个新数组而不改变原数组？',
    options: {
      A: 'push',
      B: 'pop',
      C: 'map',
      D: 'splice'
    },
    answer: 'C',
    chapterNo: 1,
    chapterTitle: 'JavaScript 进阶 - 数组方法',
    optionExplanations: {
      A: 'push 会修改原数组，在数组末尾添加元素，不返回新数组。',
      B: 'pop 会修改原数组，删除最后一个元素，不返回新数组。',
      C: 'map 会返回一个新数组，不会修改原数组，是纯函数。',
      D: 'splice 会修改原数组，删除或插入元素，不是返回新数组。'
    },
    review: {
      chapter: 'JavaScript 进阶 - 数组方法',
      concept: '数组不可变操作方法：map、filter、slice 等',
      confusionPoint: '修改原数组的方法（push、pop、splice）与返回新数组的方法（map、filter）的区别',
      errorPronePoint: '误用会修改原数组的方法，导致意外的副作用'
    }
  },
  {
    id: '8',
    question: 'JavaScript 中用于判断变量是否是数组的方法是？',
    options: {
      A: 'Array.isArray()',
      B: 'isArray()',
      C: 'instanceof Object',
      D: 'typeof arr === "array"'
    },
    answer: 'A',
    chapterNo: 1,
    chapterTitle: 'JavaScript 进阶 - 类型判断',
    optionExplanations: {
      A: 'Array.isArray(value) 是判断一个值是否为数组的标准方法，最可靠。',
      B: 'isArray() 不是全局方法，应该是 Array.isArray()，单独使用会报错。',
      C: 'instanceof Object 会返回 true（数组是对象），无法区分数组和普通对象。',
      D: 'typeof 对数组返回 "object"，不是 "array"，这个判断是错误的。'
    },
    review: {
      chapter: 'JavaScript 进阶 - 类型判断',
      concept: 'Array.isArray() 方法的使用和原理',
      confusionPoint: 'typeof、instanceof 与 Array.isArray() 的区别',
      errorPronePoint: '误用 typeof 判断数组类型，混淆数组与对象的判断'
    }
  },
  {
    id: '9',
    question: 'HTML 中用于在移动端设置视口和缩放的标签是？',
    options: {
      A: '<meta charset="utf-8">',
      B: '<meta name="viewport"...>',
      C: '<meta name="mobile"...>',
      D: '<meta name="screen"...>'
    },
    answer: 'B',
    chapterNo: 3,
    chapterTitle: 'HTML 进阶 - 移动端适配',
    optionExplanations: {
      A: '<meta charset="utf-8"> 用于设置字符编码，不是设置视口。',
      B: '<meta name="viewport" content="width=device-width, initial-scale=1.0"> 是移动端适配的标准写法。',
      C: '<meta name="mobile"...> 不是有效的 meta 标签，没有这个 name 值。',
      D: '<meta name="screen"...> 不是用于设置视口的，这是媒体查询的概念。'
    },
    review: {
      chapter: 'HTML 进阶 - 移动端适配',
      concept: 'viewport meta 标签的作用和常用配置',
      confusionPoint: 'viewport 与其他 meta 标签的区别，content 属性的含义',
      errorPronePoint: '忘记添加 viewport 标签导致移动端显示异常'
    }
  },
  {
    id: '10',
    question: '在 ES6 中，用于声明常量（不可重新赋值）的关键字是？',
    options: {
      A: 'var',
      B: 'let',
      C: 'const',
      D: 'static'
    },
    answer: 'C',
    chapterNo: 1,
    chapterTitle: 'ES6+ - 变量声明',
    optionExplanations: {
      A: 'var 是函数作用域变量，可以重新赋值，不是常量。',
      B: 'let 是块作用域变量，可以重新赋值，不是常量。',
      C: 'const 用于声明常量，不能被重新赋值（但对象内部属性仍可变）。',
      D: 'static 不是 JavaScript 的关键字，这是其他语言（如 Java）的概念。'
    },
    review: {
      chapter: 'ES6+ - 变量声明',
      concept: 'const 关键字的特点和与 let、var 的区别',
      confusionPoint: 'const 声明的对象属性可变性，const 与 let 的作用域区别',
      errorPronePoint: '误用 var 或 let 声明常量，混淆 const 与真正的不可变性'
    }
  }
];
*/

const OPTION_LABELS: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
const FAVORITE_STORAGE_KEY = 'quiz_h5_favorites';
const NOTES_STORAGE_KEY = 'quiz_notes_v1';
const PROGRESS_STORAGE_KEY = 'quiz_progress_v1';

const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [currentIndex, setCurrentIndex] = useState(0); // Practice 当前题下标
  const [wrongBookIndex, setWrongBookIndex] = useState(0); // WrongBook 当前题下标
  const [favorites, setFavorites] = useState<Set<string>>(
    () => new Set<string>()
  );
  const [answerRecords, setAnswerRecords] = useState<AnswerRecord>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  
  // 新增状态
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('sequential'); // 刷题模式
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]); // 随机模式的题目索引
  const [progress, setProgress] = useState<ProgressData>({
    lastIndex: 0,
    totalDone: 0,
    correctCount: 0,
    doneQuestionIds: [],
    updatedAt: Date.now()
  });
  
  // 认证状态
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 章节筛选状态
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null); // null 表示全部章节
  
  // 复习笔记状态
  const [notes, setNotes] = useState<NotesData>({});
  
  // 导入相关状态
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [importErrors, setImportErrors] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedForImport, setSelectedForImport] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 搜索相关状态
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Question[]>([]);

  // 初始化认证状态
  useEffect(() => {
    // 检查当前会话
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 监听认证状态变化
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // 登录后加载题目
        loadQuestions();
      } else {
        // 登出后清空题目
        setQuestions([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 从 Supabase 加载题目
  const loadQuestions = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        setQuestions([]);
        return;
      }

      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 转换数据库格式到应用格式
      const convertedQuestions: Question[] = (data || []).map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options,
        answer: q.answer,
        optionExplanations: q.option_explanations,
        chapterNo: q.chapter_no,
        chapterTitle: q.chapter_title || undefined,
        review: {
          chapter: q.review.chapter,
          concept: q.review.concept,
          confusionPoint: q.review.confusion_point,
          errorPronePoint: q.review.error_prone_point
        }
      }));

      setQuestions(convertedQuestions);
    } catch (error) {
      console.error('加载题目失败:', error);
      setQuestions([]);
    }
  };

  // 用户登录后加载题目
  useEffect(() => {
    if (user) {
      loadQuestions();
    }
  }, [user]);

  // 读取进度数据
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PROGRESS_STORAGE_KEY);
      if (stored) {
        const data: ProgressData = JSON.parse(stored);
        // 兼容旧版本数据（没有 doneQuestionIds 字段）
        if (!data.doneQuestionIds) {
          data.doneQuestionIds = [];
        }
        setProgress(data);
      }
    } catch {
      // ignore
    }
  }, []);

  // 保存进度数据到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // ignore
    }
  }, [progress]);

  // 读取收藏状态
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITE_STORAGE_KEY);
      if (stored) {
        const arr: string[] = JSON.parse(stored);
        setFavorites(new Set(arr));
      }
    } catch {
      // ignore
    }
  }, []);

  // 同步收藏到 localStorage
  useEffect(() => {
    try {
      const arr = Array.from(favorites);
      localStorage.setItem(FAVORITE_STORAGE_KEY, JSON.stringify(arr));
    } catch {
      // ignore
    }
  }, [favorites]);

  // 读取复习笔记
  useEffect(() => {
    try {
      const stored = localStorage.getItem(NOTES_STORAGE_KEY);
      if (stored) {
        const data: NotesData = JSON.parse(stored);
        setNotes(data);
      }
    } catch {
      // ignore
    }
  }, []);

  // 保存复习笔记到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    } catch {
      // ignore
    }
  }, [notes]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 记录复习笔记
  const recordReviewNote = (question: Question) => {
    // 如果题目缺少 review 字段，跳过
    if (!question.review) {
      return;
    }

    setNotes(prev => {
      const chapterNo = question.chapterNo;
      const currentChapterNotes = prev[chapterNo] || {
        chapterNo,
        chapterTitle: question.chapterTitle,
        doneCount: 0,
        concepts: [],
        confusions: [],
        errors: []
      };

      // 更新作答题数
      const newDoneCount = currentChapterNotes.doneCount + 1;

      // 添加考点（去重）
      const newConcepts = [...currentChapterNotes.concepts];
      if (question.review.concept && !newConcepts.includes(question.review.concept)) {
        newConcepts.push(question.review.concept);
      }

      // 添加易混点（去重）
      const newConfusions = [...currentChapterNotes.confusions];
      if (question.review.confusionPoint && !newConfusions.includes(question.review.confusionPoint)) {
        newConfusions.push(question.review.confusionPoint);
      }

      // 添加易错点（去重）
      const newErrors = [...currentChapterNotes.errors];
      if (question.review.errorPronePoint && !newErrors.includes(question.review.errorPronePoint)) {
        newErrors.push(question.review.errorPronePoint);
      }

      return {
        ...prev,
        [chapterNo]: {
          ...currentChapterNotes,
          chapterTitle: question.chapterTitle || currentChapterNotes.chapterTitle,
          doneCount: newDoneCount,
          concepts: newConcepts,
          confusions: newConfusions,
          errors: newErrors,
          updatedAt: Date.now()
        }
      };
    });
  };

  const handleSelectOption = (question: Question, optionKey: 'A' | 'B' | 'C' | 'D') => {
    setAnswerRecords(prev => {
      // 已作答则不允许再改
      if (prev[question.id]) {
        return prev;
      }
      const isCorrect = optionKey === question.answer;
      const newRecord = {
        ...prev,
        [question.id]: {
          selected: optionKey,
          isCorrect
        }
      };
      
      // 作答后记录复习笔记
      recordReviewNote(question);
      
      // 更新进度统计（不再保存 lastIndex，因为我们改用 answerRecords 来判断进度）
      setProgress(prevProgress => {
        const isNewQuestion = !prevProgress.doneQuestionIds.includes(question.id);
        return {
          lastIndex: currentIndex, // 保留此字段用于兼容，但不再用于"从上次继续"的逻辑
          totalDone: isNewQuestion ? prevProgress.totalDone + 1 : prevProgress.totalDone,
          correctCount: prevProgress.correctCount + (isCorrect ? 1 : 0),
          doneQuestionIds: isNewQuestion 
            ? [...prevProgress.doneQuestionIds, question.id]
            : prevProgress.doneQuestionIds,
          updatedAt: Date.now()
        };
      });
      
      return newRecord;
    });
  };

  const handlePrevPractice = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNextPractice = () => {
    if (currentIndex < filteredQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // 回到首页
      setView('home');
      setCurrentIndex(0);
    }
  };

  const answeredRecordIds = Object.keys(answerRecords);
  const wrongIdSet = new Set(
    answeredRecordIds.filter(id => !answerRecords[id].isCorrect)
  );
  const wrongOrFavoriteQuestions = questions.filter(
    q => favorites.has(q.id) || wrongIdSet.has(q.id)
  );

  // 获取可用章节列表（去重并排序）
  const availableChapters = React.useMemo(() => {
    const chapterSet = new Set<number>();
    questions.forEach(q => {
      if (q.chapterNo > 0) {
        chapterSet.add(q.chapterNo);
      }
    });
    return Array.from(chapterSet).sort((a, b) => a - b);
  }, [questions]);

  // 根据选中的章节过滤题目
  const filteredQuestions = React.useMemo(() => {
    if (selectedChapter === null) {
      return questions;
    }
    return questions.filter(q => q.chapterNo === selectedChapter);
  }, [questions, selectedChapter]);

  // 获取当前显示的题目（考虑随机模式）
  const getCurrentQuestion = (index: number): Question | undefined => {
    if (practiceMode === 'random' && shuffledIndices.length > 0) {
      const actualIndex = shuffledIndices[index];
      return filteredQuestions[actualIndex];
    }
    return filteredQuestions[index];
  };

  // 获取当前题目
  const currentQuestion = getCurrentQuestion(currentIndex);

  // 生成随机题目序列
  const generateShuffledIndices = useCallback((length: number): number[] => {
    const indices = Array.from({ length }, (_, i) => i);
    // Fisher-Yates 洗牌算法
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, []);

  // 章节筛选变化时，重置当前题索引和随机序列
  useEffect(() => {
    if (view === 'practice') {
      setCurrentIndex(0);
      // 如果是随机模式，生成新的随机序列
      if (practiceMode === 'random' && filteredQuestions.length > 0) {
        setShuffledIndices(generateShuffledIndices(filteredQuestions.length));
      }
    }
  }, [selectedChapter, view, practiceMode, filteredQuestions.length, generateShuffledIndices]);

  // WrongBook 的索引容错：列表变化时重置
  useEffect(() => {
    if (
      wrongBookIndex >= wrongOrFavoriteQuestions.length &&
      wrongOrFavoriteQuestions.length > 0
    ) {
      setWrongBookIndex(0);
    }
  }, [wrongBookIndex, wrongOrFavoriteQuestions.length]);

  const handlePrevWrongBook = () => {
    if (wrongBookIndex > 0) {
      setWrongBookIndex(wrongBookIndex - 1);
    }
  };

  const handleNextWrongBook = () => {
    if (wrongOrFavoriteQuestions.length === 0) return;
    
    if (wrongBookIndex < wrongOrFavoriteQuestions.length - 1) {
      setWrongBookIndex(wrongBookIndex + 1);
    } else {
      // 刷完错题 / 收藏题后，回到首页
      setView('home');
      setWrongBookIndex(0);
    }
  };

  // 导入相关函数
  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith('.docx')) {
      if (file.name.endsWith('.doc')) {
        setImportErrors('请将文件另存为 .docx 格式后再导入');
      } else {
        setImportErrors('仅支持 .docx 格式文件');
      }
      return;
    }

    setImportErrors('');
    try {
      const parsed = await parseDocxQuestions(file);
      setParsedQuestions(parsed);
      
      // 默认选择所有没有错误的题目
      const validIndices = new Set<number>();
      parsed.forEach((q, idx) => {
        if (q.errors.length === 0) {
          validIndices.add(idx);
        }
      });
      setSelectedForImport(validIndices);
    } catch (error) {
      setImportErrors(error instanceof Error ? error.message : '解析文件失败');
      setParsedQuestions([]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const toggleQuestionSelection = (index: number) => {
    setSelectedForImport(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleConfirmImport = async () => {
    const toImport = parsedQuestions
      .filter((_, idx) => selectedForImport.has(idx))
      .map(q => {
        // 转换为标准 Question 格式
        const question: Question = {
          id: q.id,
          question: q.question,
          options: q.options,
          answer: q.answer as 'A' | 'B' | 'C' | 'D',
          optionExplanations: q.optionExplanations,
          chapterNo: q.chapterNo,
          chapterTitle: q.chapterTitle,
          review: q.review
        };
        return question;
      })
      .filter(q => q.answer && q.question); // 过滤掉无效题目

    if (toImport.length === 0) {
      setImportErrors('没有可导入的题目');
      return;
    }

    // 检查用户是否登录
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      setImportErrors('请先登录');
      return;
    }

    try {
      // 转换为 Supabase 数据库格式
      const insertData = toImport.map(q => ({
        user_id: currentUser.id,
        question: q.question,
        options: q.options,
        answer: q.answer,
        option_explanations: q.optionExplanations,
        chapter_no: q.chapterNo,
        chapter_title: q.chapterTitle || null,
        review: {
          chapter: q.review.chapter,
          concept: q.review.concept,
          confusion_point: q.review.confusionPoint,
          error_prone_point: q.review.errorPronePoint
        }
      }));

      const { error } = await supabase
        .from('questions')
        .insert(insertData);

      if (error) throw error;

      // 重新加载题目列表
      await loadQuestions();
      
      // 重置导入状态
      setParsedQuestions([]);
      setSelectedForImport(new Set());
      setImportErrors('');
      
      alert(`成功导入 ${toImport.length} 道题目！`);
      setView('home');
    } catch (error) {
      console.error('导入失败:', error);
      setImportErrors(error instanceof Error ? error.message : '导入失败，请重试');
    }
  };

  // 删除题目
  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('确定要删除这道题目吗？')) {
      return;
    }

    try {
      // 从 Supabase 删除
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;

      // 如果正在刷题，先检查当前题目是否会被删除
      const isCurrentQuestion = view === 'practice' && currentQuestion?.id === questionId;
      const currentChapter = view === 'practice' ? selectedChapter : null;

      // 从本地状态中删除
      setQuestions(prev => {
        const newQuestions = prev.filter(q => q.id !== questionId);
        
        // 如果正在刷题，检查删除后的题目列表
        if (isCurrentQuestion) {
          const newFilteredQuestions = currentChapter === null
            ? newQuestions
            : newQuestions.filter(q => q.chapterNo === currentChapter);
          
          if (newFilteredQuestions.length === 0) {
            // 如果删除后没有题目了，返回首页
            setTimeout(() => {
              setView('home');
              setCurrentIndex(0);
            }, 0);
          } else if (currentIndex >= newFilteredQuestions.length) {
            // 如果索引越界，重置到最后一题
            setTimeout(() => {
              setCurrentIndex(newFilteredQuestions.length - 1);
            }, 0);
          }
        }
        
        return newQuestions;
      });

      // 从收藏中删除
      setFavorites(prev => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });

      // 从答案记录中删除
      setAnswerRecords(prev => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败：' + (error instanceof Error ? error.message : '请重试'));
    }
  };

  const renderQuestionCard = (
    question: Question,
    index: number,
    total: number,
    isPracticeView: boolean = false
  ) => {
    const record = answerRecords[question.id];
    const hasAnswered = !!record;

  return (
      <div className="quiz-card">
        <div style={{ marginBottom: 8 }}>
          <span className="quiz-tag">
            第 {index + 1} / {total} 题
          </span>
        </div>
        <div className="quiz-question-text">
          {question.question}
        </div>
        <div style={{ marginBottom: 8 }}>
          {OPTION_LABELS.map((label) => {
            const opt = question.options[label];
            const isSelected = record && record.selected === label;
            const isCorrectChoice = label === question.answer;

            let backgroundColor = '#ffffff';
            let borderColor = '#d9d9d9';

            if (hasAnswered) {
              if (isCorrectChoice) {
                backgroundColor = '#f6ffed';
                borderColor = '#52c41a';
              }
              if (isSelected) {
                if (record!.isCorrect) {
                  backgroundColor = '#e6fffb';
                  borderColor = '#13c2c2';
                } else {
                  backgroundColor = '#fff1f0';
                  borderColor = '#ff4d4f';
                }
              }
            }

            return (
              <div key={label} style={{ marginBottom: hasAnswered && isPracticeView ? 0 : 8 }}>
                <button
                  className="quiz-option-button"
                  style={{
                    backgroundColor,
                    borderColor,
                    marginBottom: 0,
                    opacity: hasAnswered && !isSelected ? 0.95 : 1,
                    cursor: hasAnswered ? 'default' : 'pointer'
                  }}
                  onClick={() => handleSelectOption(question, label)}
                  disabled={hasAnswered}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        minWidth: 24
                      }}
                    >
                      {label}.
                    </span>
                    <span>{opt}</span>
                  </div>
                </button>
                {/* 层1：逐选项解析（仅在Practice视图且已作答时显示） */}
                {hasAnswered && isPracticeView && (
                  <div className="quiz-option-explanation">
                    {isCorrectChoice ? (
                      <span>
                        <span style={{ color: '#52c41a', fontWeight: 500 }}>✅ 正确：</span>
                        {question.optionExplanations[label]}
                      </span>
                    ) : (
                      <span>
                        <span style={{ color: '#ff4d4f', fontWeight: 500 }}>❌ 错误：</span>
                        {question.optionExplanations[label]}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 层2：考点复盘模块（仅在非Practice视图且已作答时显示，Practice视图的考点复盘在右侧显示） */}
        {hasAnswered && !isPracticeView && (
          <div className="quiz-review-box">
            <div className="quiz-review-title">
              考点复盘
            </div>
            <div style={{ color: '#333' }}>
              <div>• 书本章节：{question.review.chapter}</div>
              <div>• 考点：{question.review.concept}</div>
              <div>• 易混点：{question.review.confusionPoint}</div>
              <div>• 易错点：{question.review.errorPronePoint}</div>
            </div>
          </div>
        )}

        {/* WrongBook视图的反馈展示（非Practice视图） */}
        {hasAnswered && !isPracticeView && (
          <div className="quiz-feedback-box">
            <div
              style={{
                fontSize: 16,
                marginBottom: 4
              }}
            >
              {record!.isCorrect ? '✅ 回答正确' : '❌ 回答错误'}
            </div>
            <div style={{ marginBottom: 4 }}>
              正确答案：{question.answer}. {question.options[question.answer]}
            </div>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 12
          }}
        >
          <button
            className="quiz-favorite-button"
            onClick={() => toggleFavorite(question.id)}
          >
            {favorites.has(question.id) ? '❤️ 已收藏' : '🤍 收藏'}
          </button>
        </div>
      </div>
    );
  };

  // 处理退出登录
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setView('home');
  };

  // 路由保护：未登录时禁止进入导入/刷题页
  useEffect(() => {
    if (!loading && !user) {
      if (view === 'import' || view === 'practice') {
        setView('home');
      }
    }
  }, [user, loading, view]);

  // 如果正在加载，显示加载中
  if (loading) {
    return (
      <div className="quiz-container">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: 16, color: '#666' }}>加载中...</div>
        </div>
      </div>
    );
  }

  // 如果未登录，显示登录页
  if (!user) {
    return <Auth onAuthSuccess={() => setView('home')} />;
  }

  return (
    <div className="quiz-container">
      {/* 用户信息栏 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          padding: '12px 16px',
          backgroundColor: '#ffffff',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}
      >
        <div style={{ fontSize: 14, color: '#666' }}>
          当前用户：<span style={{ color: '#1677ff', fontWeight: 500 }}>{user.email}</span>
        </div>
        <button
          onClick={handleSignOut}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid #d9d9d9',
            backgroundColor: '#ffffff',
            color: '#666',
            fontSize: 13,
            cursor: 'pointer'
          }}
        >
          退出
        </button>
      </div>

      <div className="quiz-title">刷题 H5 Demo</div>

      {view === 'home' && (
        <>
          <div className="quiz-card">
            <div className="quiz-subtitle">首页</div>
            <div
              style={{
                fontSize: 14,
                color: '#666',
                marginBottom: 14,
                lineHeight: 1.6
              }}
            >
              简单的刷题 H5 Demo，支持单选题练习、收藏与错题本。
            </div>

            {/* 进度统计卡片 */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
                marginBottom: 16
              }}
            >
              {/* 刷题进度 */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#ffffff',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                }}
              >
                <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 8 }}>
                  📚 刷题进度
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
                  {progress.totalDone} / {questions.length}
                </div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>
                  正确率：{progress.totalDone > 0 
                    ? Math.round((progress.correctCount / progress.totalDone) * 100) 
                    : 0}%
                  {questions.length === 0 && ' (请先导入题目)'}
                </div>
              </div>

              {/* 错题进度 */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  color: '#ffffff',
                  boxShadow: '0 4px 12px rgba(245, 87, 108, 0.3)'
                }}
              >
                <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 8 }}>
                  ❌ 错题统计
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
                  {wrongIdSet.size}
                </div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>
                  收藏题目：{favorites.size} 道
                </div>
              </div>
            </div>

            <button
              className="quiz-button-primary"
              onClick={() => {
                if (!user) {
                  alert('请先登录');
                  return;
                }
                // 从上次进度继续（不清空答案记录）
                // 找到第一道未作答的题目
                let nextIndex = 0;
                for (let i = 0; i < questions.length; i++) {
                  if (!answerRecords[questions[i].id]) {
                    nextIndex = i;
                    break;
                  }
                }
                
                // 如果所有题目都已作答，从头开始
                if (nextIndex === 0 && questions.length > 0 && answerRecords[questions[0].id]) {
                  if (confirm('所有题目已完成！是否从头开始复习？')) {
                    nextIndex = 0;
                  } else {
                    return;
                  }
                }
                
                setCurrentIndex(nextIndex);
                setView('practice');
              }}
            >
              从上次继续刷题
            </button>
            <button
              className="quiz-button-secondary"
              onClick={() => {
                if (!user) {
                  alert('请先登录');
                  return;
                }
                // 从头开始刷题（清空所有答案记录）
                if (Object.keys(answerRecords).length > 0) {
                  if (confirm('从头开始将清空所有答题记录，确定要继续吗？')) {
                    setAnswerRecords({});
                    setProgress({
                      lastIndex: 0,
                      totalDone: 0,
                      correctCount: 0,
                      doneQuestionIds: [],
                      updatedAt: Date.now()
                    });
                  } else {
                    return;
                  }
                }
                setCurrentIndex(0);
                setView('practice');
              }}
            >
              从头开始刷题
            </button>
            <button
              className="quiz-button-secondary"
              onClick={() => {
                setView('wrongBook');
                setWrongBookIndex(0);
              }}
            >
              查看错题本 / 收藏
            </button>
            <button
              className="quiz-button-secondary"
              onClick={() => {
                if (!user) {
                  alert('请先登录');
                  return;
                }
                setView('import');
                setParsedQuestions([]);
                setImportErrors('');
                setSelectedForImport(new Set());
              }}
            >
              导入题目
            </button>
            <button
              className="quiz-button-secondary"
              onClick={() => {
                setView('library');
              }}
            >
              题库管理
            </button>
            <button
              className="quiz-button-secondary"
              onClick={() => {
                setView('notes');
              }}
            >
              复习笔记
            </button>
            <button
              className="quiz-button-secondary"
              onClick={() => {
                setView('search');
                setSearchKeyword('');
                setSearchResults([]);
              }}
            >
              🔍 搜索题目
            </button>
            <button
              className="quiz-button-secondary"
              onClick={() => {
                setView('chapterProgress');
              }}
            >
              📊 章节进度
            </button>
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: '#999'
              }}
            >
              提示：收藏会保存到 localStorage，刷新页面也不会丢失。
      </div>
          </div>
        </>
      )}

      {view === 'practice' && (
        <>
          <div
            style={{
              marginBottom: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap' as const,
              gap: 8
            }}
          >
            <span className="quiz-subtitle">刷题</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {/* 出题模式切换 */}
              <select
                value={practiceMode}
                onChange={(e) => {
                  const newMode = e.target.value as PracticeMode;
                  if (currentIndex > 0 && !confirm('切换出题模式将从第一题重新开始，确定要切换吗？')) {
                    return;
                  }
                  setPracticeMode(newMode);
                  setCurrentIndex(0);
                  // 如果切换到随机模式，生成随机序列
                  if (newMode === 'random' && filteredQuestions.length > 0) {
                    setShuffledIndices(generateShuffledIndices(filteredQuestions.length));
                  }
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1px solid #d9d9d9',
                  fontSize: 14,
                  backgroundColor: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                <option value="sequential">顺序出题</option>
                <option value="random">随机出题</option>
              </select>
              
              {/* 章节筛选下拉框 */}
              {availableChapters.length > 0 && (
                <select
                  value={selectedChapter === null ? '' : selectedChapter}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedChapter(value === '' ? null : parseInt(value, 10));
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid #d9d9d9',
                    fontSize: 14,
                    backgroundColor: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">全部章节</option>
                  {availableChapters.map(chapterNo => {
                    const chapterTitle = questions.find(q => q.chapterNo === chapterNo)?.chapterTitle;
                    return (
                      <option key={chapterNo} value={chapterNo}>
                        第{chapterNo}章{chapterTitle ? ` - ${chapterTitle}` : ''}
                      </option>
                    );
                  })}
                </select>
              )}
              <span
                className="quiz-link-small"
                onClick={() => {
                  setView('home');
                }}
              >
                ‹ 返回首页
              </span>
            </div>
          </div>

          {filteredQuestions.length > 0 ? (
            currentQuestion ? (
              <div className="quiz-practice-layout">
                <div className="quiz-practice-left">
                  {renderQuestionCard(
                    currentQuestion,
                    currentIndex,
                    filteredQuestions.length,
                    true // isPracticeView = true
                  )}
                  <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                    <button
                      className="quiz-button-secondary"
                      style={{
                        flex: 1,
                        opacity: currentIndex === 0 ? 0.5 : 1,
                        cursor: currentIndex === 0 ? 'not-allowed' : 'pointer'
                      }}
                      disabled={currentIndex === 0}
                      onClick={handlePrevPractice}
                    >
                      ← 上一题
                    </button>
                    <button
                      className="quiz-button-next"
                      style={{
                        flex: 1,
                        ...(
                          !answerRecords[currentQuestion?.id]
                            ? {
                                backgroundColor: '#d9d9d9',
                                background: '#d9d9d9',
                                boxShadow: 'none',
                                cursor: 'not-allowed'
                              }
                            : {}
                        )
                      }}
                      disabled={!answerRecords[currentQuestion?.id]}
                      onClick={handleNextPractice}
                    >
                      {currentIndex < filteredQuestions.length - 1
                        ? '下一题 →'
                        : '完成 ✓'}
                    </button>
                  </div>
                </div>
                {/* 右侧：解析和考点复盘（仅在已作答时显示） */}
                {answerRecords[currentQuestion?.id] && (
                  <div className="quiz-practice-right">
                    <div className="quiz-card">
                      <div className="quiz-subtitle" style={{ marginBottom: 16 }}>
                        详细解析
                      </div>
                      {/* 考点复盘模块 */}
                      <div className="quiz-review-box">
                        <div className="quiz-review-title">
                          考点复盘
                        </div>
                        <div style={{ color: '#333' }}>
                          <div>• 书本章节：{currentQuestion.review.chapter}</div>
                          <div>• 考点：{currentQuestion.review.concept}</div>
                          <div>• 易混点：{currentQuestion.review.confusionPoint}</div>
                          <div>• 易错点：{currentQuestion.review.errorPronePoint}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="quiz-card">
                <div style={{ fontSize: 15, color: '#666', lineHeight: 1.6, textAlign: 'center', padding: '20px 0' }}>
                  题目加载出错，请返回首页重试。
                </div>
                <button
                  className="quiz-button-secondary"
                  onClick={() => setView('home')}
                >
                  返回首页
                </button>
              </div>
            )
          ) : (
            <div className="quiz-card">
              <div style={{ fontSize: 15, color: '#666', lineHeight: 1.6 }}>
                {selectedChapter === null
                  ? '题库为空，请先导入题目。'
                  : `第${selectedChapter}章暂无题目。`}
              </div>
            </div>
          )}
        </>
      )}

      {view === 'wrongBook' && (
        <>
          <div
            style={{
              marginBottom: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span className="quiz-subtitle">错题本 / 收藏</span>
            <span
              className="quiz-link-small"
              onClick={() => {
                setView('home');
              }}
            >
              ‹ 返回首页
            </span>
          </div>

          {wrongOrFavoriteQuestions.length === 0 ? (
            <div className="quiz-card">
              <div
                style={{
                  fontSize: 15,
                  color: '#666',
                  lineHeight: 1.6
                }}
              >
                还没有错题或收藏题目。
                <br />
                可以先去「刷题」页面做题，错题和点 ❤️ 收藏的题都会出现在这里。
              </div>
            </div>
          ) : (
            <>
              {renderQuestionCard(
                wrongOrFavoriteQuestions[wrongBookIndex],
                wrongBookIndex,
                wrongOrFavoriteQuestions.length,
                false // isPracticeView = false
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button
                  className="quiz-button-secondary"
                  style={{
                    flex: 1,
                    opacity: wrongBookIndex === 0 ? 0.5 : 1,
                    cursor: wrongBookIndex === 0 ? 'not-allowed' : 'pointer'
                  }}
                  disabled={wrongBookIndex === 0}
                  onClick={handlePrevWrongBook}
                >
                  ← 上一题
                </button>
                <button
                  className="quiz-button-next"
                  style={{
                    flex: 1,
                    ...(
                      !answerRecords[wrongOrFavoriteQuestions[wrongBookIndex].id]
                        ? {
                            backgroundColor: '#d9d9d9',
                            background: '#d9d9d9',
                            boxShadow: 'none',
                            cursor: 'not-allowed'
                          }
                        : {}
                    )
                  }}
                  disabled={
                    !answerRecords[wrongOrFavoriteQuestions[wrongBookIndex].id]
                  }
                  onClick={handleNextWrongBook}
                >
                  {wrongBookIndex < wrongOrFavoriteQuestions.length - 1
                    ? '下一题 →'
                    : '完成 ✓'}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {view === 'import' && (
        <>
          <div
            style={{
              marginBottom: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span className="quiz-subtitle">导入题目</span>
            <span
              className="quiz-link-small"
              onClick={() => {
                setView('home');
              }}
            >
              ‹ 返回首页
            </span>
          </div>

          <div className="quiz-import-layout">
            <div className="quiz-import-left">
              <div className="quiz-card">
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>
                    拖拽上传 Word 文件
                  </div>
                  <div
                    className={`quiz-upload-area ${isDragging ? 'dragging' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
                    <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                      拖拽 .docx 文件到此处，或点击选择文件
                    </div>
                    <div style={{ fontSize: 12, color: '#999' }}>
                      仅支持 .docx 格式
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx"
                    style={{ display: 'none' }}
                    onChange={handleFileInputChange}
                  />
                </div>

                {importErrors && (
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 8,
                      backgroundColor: '#fff1f0',
                      border: '1px solid #ffccc7',
                      color: '#cf1322',
                      fontSize: 14,
                      marginBottom: 16
                    }}
                  >
                    {importErrors}
                  </div>
                )}

                {parsedQuestions.length > 0 && (
                  <>
                    <div
                      style={{
                        marginTop: 16,
                        padding: '12px',
                        backgroundColor: '#f5f5f5',
                        borderRadius: 8,
                        fontSize: 13,
                        color: '#666'
                      }}
                    >
                      已选择 {selectedForImport.size} / {parsedQuestions.length} 道题目
                    </div>

                    <button
                      className="quiz-button-primary"
                      style={{
                        marginTop: 16,
                        opacity: selectedForImport.size === 0 ? 0.5 : 1,
                        cursor: selectedForImport.size === 0 ? 'not-allowed' : 'pointer'
                      }}
                      onClick={handleConfirmImport}
                      disabled={selectedForImport.size === 0}
                    >
                      确认导入 ({selectedForImport.size} 道)
                    </button>
                  </>
                )}
              </div>
            </div>

            {parsedQuestions.length > 0 && (
              <div className="quiz-import-right">
                <div className="quiz-card">
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 500,
                      marginBottom: 12,
                      paddingBottom: 8,
                      borderBottom: '1px solid #f0f0f0'
                    }}
                  >
                    预览题目 ({parsedQuestions.length} 道)
                  </div>

                  <div className="quiz-preview-list">
                  {parsedQuestions.map((q, idx) => {
                    const hasErrors = q.errors.length > 0;
                    const isSelected = selectedForImport.has(idx);

                    return (
                      <div
                        key={idx}
                        style={{
                          padding: '12px',
                          marginBottom: 12,
                          borderRadius: 8,
                          border: `1px solid ${hasErrors ? '#ffccc7' : isSelected ? '#91caff' : '#e8e8e8'}`,
                          backgroundColor: hasErrors
                            ? '#fff1f0'
                            : isSelected
                            ? '#f0f7ff'
                            : '#fafafa'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 10,
                            marginBottom: 8
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleQuestionSelection(idx)}
                            style={{ marginTop: 4 }}
                          />
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 500,
                                marginBottom: 6,
                                color: hasErrors ? '#cf1322' : '#333'
                              }}
                            >
                              题目 {idx + 1}
                              {hasErrors && (
                                <span style={{ fontSize: 12, color: '#cf1322', marginLeft: 8 }}>
                                  (有错误)
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                fontSize: 13,
                                color: '#666',
                                marginBottom: 6,
                                lineHeight: 1.5,
                                maxHeight: 60,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {q.question || '(题干为空)'}
                            </div>
                            <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
                              答案：{q.answer || '(未找到)'} | 选项：{' '}
                              {['A', 'B', 'C', 'D']
                                .filter(key => q.options[key as 'A' | 'B' | 'C' | 'D'])
                                .join(', ') || '(无)'}
                            </div>
                            {hasErrors && (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: '#cf1322',
                                  marginTop: 6,
                                  padding: '6px 8px',
                                  backgroundColor: '#fff',
                                  borderRadius: 4
                                }}
                              >
                                {q.errors.map((err, i) => (
                                  <div key={i}>• {err}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {view === 'library' && (
        <>
          <div
            style={{
              marginBottom: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span className="quiz-subtitle">题库管理</span>
            <span
              className="quiz-link-small"
              onClick={() => {
                setView('home');
              }}
            >
              ‹ 返回首页
            </span>
          </div>

          {questions.length === 0 ? (
            <div className="quiz-card">
              <div style={{ fontSize: 15, color: '#666', lineHeight: 1.6 }}>
                题库为空，请先导入题目。
              </div>
            </div>
          ) : (
            <div className="quiz-card">
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  marginBottom: 16,
                  paddingBottom: 12,
                  borderBottom: '1px solid #f0f0f0'
                }}
              >
                共 {questions.length} 道题目
              </div>
              <div style={{ maxHeight: '70vh', overflowY: 'auto' as const }}>
                {questions.map((q, idx) => {
                  const questionPreview = q.question.length > 80
                    ? q.question.substring(0, 80) + '...'
                    : q.question;

                  return (
                    <div
                      key={q.id}
                      style={{
                        padding: '14px',
                        marginBottom: 12,
                        borderRadius: 8,
                        border: '1px solid #e8e8e8',
                        backgroundColor: '#fafafa'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 12,
                          marginBottom: 8
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              marginBottom: 6
                            }}
                          >
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: 4,
                                backgroundColor: '#e6f7ff',
                                color: '#1677ff',
                                fontSize: 12,
                                fontWeight: 500
                              }}
                            >
                              第{q.chapterNo}章{q.chapterTitle ? ` - ${q.chapterTitle}` : ''}
                            </span>
                            <span
                              style={{
                                fontSize: 12,
                                color: '#999'
                              }}
                            >
                              题目 {idx + 1}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: 14,
                              color: '#333',
                              lineHeight: 1.6
                            }}
                          >
                            {questionPreview}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 6,
                            border: '1px solid #ffccc7',
                            backgroundColor: '#fff1f0',
                            color: '#cf1322',
                            fontSize: 13,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap' as const
                          }}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {view === 'notes' && (
        <>
          <div
            style={{
              marginBottom: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap' as const,
              gap: 8
            }}
          >
            <span className="quiz-subtitle">复习笔记</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {Object.keys(notes).length > 0 && (
                <button
                  onClick={() => {
                    if (confirm('确定要清空所有复习笔记吗？此操作不可恢复。')) {
                      setNotes({});
                      localStorage.removeItem(NOTES_STORAGE_KEY);
                    }
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid #ffccc7',
                    backgroundColor: '#fff1f0',
                    color: '#cf1322',
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  清空笔记
                </button>
              )}
              <span
                className="quiz-link-small"
                onClick={() => {
                  setView('home');
                }}
              >
                ‹ 返回首页
              </span>
            </div>
          </div>

          {Object.keys(notes).length === 0 ? (
            <div className="quiz-card">
              <div style={{ fontSize: 15, color: '#666', lineHeight: 1.6 }}>
                还没有复习笔记。
                <br />
                开始刷题后，系统会自动记录每道题的复盘信息。
              </div>
            </div>
          ) : (
            <div>
              {Object.values(notes)
                .sort((a, b) => a.chapterNo - b.chapterNo)
                .map((chapterNotes) => (
                  <div key={chapterNotes.chapterNo} className="quiz-card" style={{ marginBottom: 20 }}>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 600,
                        marginBottom: 12,
                        paddingBottom: 12,
                        borderBottom: '2px solid #f0f0f0'
                      }}
                    >
                      Chapter {chapterNotes.chapterNo}
                      {chapterNotes.chapterTitle && ` - ${chapterNotes.chapterTitle}`}
                    </div>

                    <div
                      style={{
                        fontSize: 14,
                        color: '#666',
                        marginBottom: 16,
                        padding: '8px 12px',
                        backgroundColor: '#f5f5f5',
                        borderRadius: 6
                      }}
                    >
                      已刷题数：{chapterNotes.doneCount} 道
                    </div>

                    {/* 考点提纲 */}
                    <div style={{ marginBottom: 16 }}>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 600,
                          marginBottom: 8,
                          color: '#1677ff'
                        }}
                      >
                        考点提纲
                      </div>
                      {chapterNotes.concepts.length > 0 ? (
                        <ul
                          style={{
                            margin: 0,
                            paddingLeft: 20,
                            fontSize: 14,
                            lineHeight: 1.8,
                            color: '#333'
                          }}
                        >
                          {chapterNotes.concepts.map((concept, idx) => (
                            <li key={idx}>{concept}</li>
                          ))}
                        </ul>
                      ) : (
                        <div style={{ fontSize: 13, color: '#999', fontStyle: 'italic' }}>
                          暂无考点记录
                        </div>
                      )}
                    </div>

                    {/* 易混点 */}
                    <div style={{ marginBottom: 16 }}>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 600,
                          marginBottom: 8,
                          color: '#fa8c16'
                        }}
                      >
                        易混点
                      </div>
                      {chapterNotes.confusions.length > 0 ? (
                        <ul
                          style={{
                            margin: 0,
                            paddingLeft: 20,
                            fontSize: 14,
                            lineHeight: 1.8,
                            color: '#333'
                          }}
                        >
                          {chapterNotes.confusions.map((confusion, idx) => (
                            <li key={idx}>{confusion}</li>
                          ))}
                        </ul>
                      ) : (
                        <div style={{ fontSize: 13, color: '#999', fontStyle: 'italic' }}>
                          暂无易混点记录
                        </div>
                      )}
                    </div>

                    {/* 易错点 */}
                    <div>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 600,
                          marginBottom: 8,
                          color: '#cf1322'
                        }}
                      >
                        易错点
                      </div>
                      {chapterNotes.errors.length > 0 ? (
                        <ul
                          style={{
                            margin: 0,
                            paddingLeft: 20,
                            fontSize: 14,
                            lineHeight: 1.8,
                            color: '#333'
                          }}
                        >
                          {chapterNotes.errors.map((error, idx) => (
                            <li key={idx}>{error}</li>
                          ))}
                        </ul>
                      ) : (
                        <div style={{ fontSize: 13, color: '#999', fontStyle: 'italic' }}>
                          暂无易错点记录
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      )}

      {view === 'search' && (
        <>
          <div
            style={{
              marginBottom: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span className="quiz-subtitle">搜索题目</span>
            <span
              className="quiz-link-small"
              onClick={() => {
                setView('home');
              }}
            >
              ‹ 返回首页
            </span>
          </div>

          <div className="quiz-card">
            <div style={{ marginBottom: 16 }}>
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => {
                  const keyword = e.target.value;
                  setSearchKeyword(keyword);
                  
                  // 实时搜索
                  if (keyword.trim()) {
                    const results = questions.filter(q => 
                      q.question.toLowerCase().includes(keyword.toLowerCase()) ||
                      q.options.A.toLowerCase().includes(keyword.toLowerCase()) ||
                      q.options.B.toLowerCase().includes(keyword.toLowerCase()) ||
                      q.options.C.toLowerCase().includes(keyword.toLowerCase()) ||
                      q.options.D.toLowerCase().includes(keyword.toLowerCase()) ||
                      (q.chapterTitle && q.chapterTitle.toLowerCase().includes(keyword.toLowerCase())) ||
                      q.review.concept.toLowerCase().includes(keyword.toLowerCase())
                    );
                    setSearchResults(results);
                  } else {
                    setSearchResults([]);
                  }
                }}
                placeholder="输入关键词搜索题目、选项、章节或考点..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: '1px solid #d9d9d9',
                  fontSize: 15,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {searchKeyword && (
              <div style={{ marginBottom: 12, fontSize: 14, color: '#666' }}>
                找到 {searchResults.length} 道题目
              </div>
            )}

            {searchResults.length > 0 ? (
              <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {searchResults.map((q) => {
                  const isAnswered = !!answerRecords[q.id];
                  const isCorrect = isAnswered && answerRecords[q.id].isCorrect;
                  
                  return (
                    <div
                      key={q.id}
                      style={{
                        padding: '14px',
                        marginBottom: 12,
                        borderRadius: 8,
                        border: '1px solid #e8e8e8',
                        backgroundColor: isAnswered 
                          ? (isCorrect ? '#f6ffed' : '#fff1f0')
                          : '#fafafa',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        // 跳转到该题目
                        const questionIndex = questions.findIndex(question => question.id === q.id);
                        if (questionIndex !== -1) {
                          setCurrentIndex(questionIndex);
                          setSelectedChapter(null); // 清除章节筛选
                          setView('practice');
                        }
                      }}
                    >
                      <div style={{ marginBottom: 8 }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 4,
                            backgroundColor: '#e6f7ff',
                            color: '#1677ff',
                            fontSize: 12,
                            fontWeight: 500,
                            marginRight: 8
                          }}
                        >
                          第{q.chapterNo}章
                        </span>
                        {isAnswered && (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 4,
                              backgroundColor: isCorrect ? '#d9f7be' : '#ffccc7',
                              color: isCorrect ? '#52c41a' : '#cf1322',
                              fontSize: 12,
                              fontWeight: 500
                            }}
                          >
                            {isCorrect ? '✓ 已答对' : '✗ 已答错'}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          color: '#333',
                          lineHeight: 1.6,
                          marginBottom: 6
                        }}
                      >
                        {q.question}
                      </div>
                      <div style={{ fontSize: 12, color: '#999' }}>
                        考点：{q.review.concept}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : searchKeyword ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
                未找到相关题目
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
                请输入关键词开始搜索
              </div>
            )}
          </div>
        </>
      )}

      {view === 'chapterProgress' && (
        <>
          <div
            style={{
              marginBottom: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span className="quiz-subtitle">章节进度</span>
            <span
              className="quiz-link-small"
              onClick={() => {
                setView('home');
              }}
            >
              ‹ 返回首页
            </span>
          </div>

          {availableChapters.length === 0 ? (
            <div className="quiz-card">
              <div style={{ fontSize: 15, color: '#666', lineHeight: 1.6 }}>
                题库为空，请先导入题目。
              </div>
            </div>
          ) : (
            <div>
              {availableChapters.map(chapterNo => {
                const chapterQuestions = questions.filter(q => q.chapterNo === chapterNo);
                const chapterTitle = chapterQuestions[0]?.chapterTitle;
                const totalCount = chapterQuestions.length;
                
                // 计算该章节的完成情况
                const doneQuestions = chapterQuestions.filter(q => answerRecords[q.id]);
                const doneCount = doneQuestions.length;
                const correctCount = doneQuestions.filter(q => answerRecords[q.id].isCorrect).length;
                const wrongCount = doneCount - correctCount;
                const donePercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
                const correctPercent = doneCount > 0 ? Math.round((correctCount / doneCount) * 100) : 0;

                return (
                  <div key={chapterNo} className="quiz-card" style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: 12
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 600,
                            marginBottom: 4,
                            color: '#333'
                          }}
                        >
                          第 {chapterNo} 章
                          {chapterTitle && ` - ${chapterTitle}`}
                        </div>
                        <div style={{ fontSize: 13, color: '#999' }}>
                          共 {totalCount} 道题目
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedChapter(chapterNo);
                          setCurrentIndex(0);
                          setView('practice');
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          border: '1px solid #1677ff',
                          backgroundColor: '#ffffff',
                          color: '#1677ff',
                          fontSize: 13,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        开始刷题
                      </button>
                    </div>

                    {/* 进度条 */}
                    <div style={{ marginBottom: 12 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: 6,
                          fontSize: 13,
                          color: '#666'
                        }}
                      >
                        <span>完成进度</span>
                        <span>{doneCount} / {totalCount} ({donePercent}%)</span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: 8,
                          backgroundColor: '#f0f0f0',
                          borderRadius: 4,
                          overflow: 'hidden'
                        }}
                      >
                        <div
                          style={{
                            width: `${donePercent}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #1677ff 0%, #69b1ff 100%)',
                            transition: 'width 0.3s ease'
                          }}
                        />
                      </div>
                    </div>

                    {/* 统计信息 */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 12
                      }}
                    >
                      <div
                        style={{
                          padding: '12px',
                          borderRadius: 6,
                          backgroundColor: '#f0f7ff',
                          textAlign: 'center'
                        }}
                      >
                        <div style={{ fontSize: 20, fontWeight: 600, color: '#1677ff', marginBottom: 4 }}>
                          {doneCount}
                        </div>
                        <div style={{ fontSize: 12, color: '#666' }}>已完成</div>
                      </div>
                      <div
                        style={{
                          padding: '12px',
                          borderRadius: 6,
                          backgroundColor: '#f6ffed',
                          textAlign: 'center'
                        }}
                      >
                        <div style={{ fontSize: 20, fontWeight: 600, color: '#52c41a', marginBottom: 4 }}>
                          {correctCount}
                        </div>
                        <div style={{ fontSize: 12, color: '#666' }}>答对</div>
                      </div>
                      <div
                        style={{
                          padding: '12px',
                          borderRadius: 6,
                          backgroundColor: '#fff1f0',
                          textAlign: 'center'
                        }}
                      >
                        <div style={{ fontSize: 20, fontWeight: 600, color: '#ff4d4f', marginBottom: 4 }}>
                          {wrongCount}
                        </div>
                        <div style={{ fontSize: 12, color: '#666' }}>答错</div>
                      </div>
                    </div>

                    {doneCount > 0 && (
                      <div
                        style={{
                          marginTop: 12,
                          padding: '8px 12px',
                          borderRadius: 6,
                          backgroundColor: '#fafafa',
                          fontSize: 13,
                          color: '#666',
                          textAlign: 'center'
                        }}
                      >
                        正确率：{correctPercent}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default App;