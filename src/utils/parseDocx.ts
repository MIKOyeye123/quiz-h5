import mammoth from 'mammoth';

export interface ParsedQuestion {
  id: string;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  answer: 'A' | 'B' | 'C' | 'D' | '';
  optionExplanations: { A: string; B: string; C: string; D: string };
  chapterNo: number;
  chapterTitle?: string;
  review: {
    chapter: string;
    concept: string;
    confusionPoint: string;
    errorPronePoint: string;
  };
  rawText: string; // 原始文本，用于调试
  errors: string[]; // 解析错误列表
}

/**
 * 从 docx 文件提取文本
 */
export async function extractTextFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

/**
 * 切分题目文本
 */
function splitQuestions(text: string): string[] {
  const questionBlocks: string[] = [];
  const lines = text.split(/\r?\n/);
  let currentBlock: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('复述原题：')) {
      // 如果遇到新的题目开始标记，保存上一题
      if (currentBlock.length > 0) {
        questionBlocks.push(currentBlock.join('\n'));
        currentBlock = [];
      }
      currentBlock.push(line);
    } else if (currentBlock.length > 0) {
      currentBlock.push(line);
    }
  }
  
  // 保存最后一题
  if (currentBlock.length > 0) {
    questionBlocks.push(currentBlock.join('\n'));
  }
  
  return questionBlocks;
}

/**
 * 解析单个题目
 */
function parseQuestion(blockText: string, index: number): ParsedQuestion {
  const errors: string[] = [];
  
  // 初始化题目对象
  const question: ParsedQuestion = {
    id: `imported_${Date.now()}_${index}`,
    question: '',
    options: { A: '', B: '', C: '', D: '' },
    answer: '',
    optionExplanations: { A: '', B: '', C: '', D: '' },
    chapterNo: 0,
    chapterTitle: undefined,
    review: {
      chapter: '',
      concept: '',
      confusionPoint: '',
      errorPronePoint: ''
    },
    rawText: blockText,
    errors: []
  };
  
  // 提取题干（从"复述原题："到"选项解析："之间）
  const questionStartIndex = blockText.indexOf('复述原题：');
  const optionsStartIndex = blockText.indexOf('选项解析：');
  
  if (questionStartIndex === -1) {
    errors.push('缺少"复述原题："标记');
  } else if (optionsStartIndex === -1) {
    errors.push('缺少"选项解析："标记');
  } else {
    const questionText = blockText
      .substring(questionStartIndex + '复述原题：'.length, optionsStartIndex)
      .trim();
    question.question = questionText || '';
    if (!question.question) {
      errors.push('题干为空');
    }
  }
  
  // 提取选项和解析
  if (optionsStartIndex !== -1) {
    const optionsSection = blockText.substring(optionsStartIndex + '选项解析：'.length);
    // 在"本题汇总信息："之前截断
    const reviewStartIndex = optionsSection.indexOf('本题汇总信息：');
    const optionsText = reviewStartIndex !== -1 
      ? optionsSection.substring(0, reviewStartIndex)
      : optionsSection;
    
    const optionLines = optionsText.split(/\r?\n/).map(l => l.trim()).filter(l => l);
    
    let currentOption: 'A' | 'B' | 'C' | 'D' | null = null;
    let currentExplanation = '';
    let isInExplanation = false;
    
    for (const line of optionLines) {
      // 检测选项标记（A. / A、/ • A / - A / * A 等，支持多种格式）
      const optionMatch = line.match(/^[•\-*\s]*([A-D])[.、：:\s]+(.+)$/);
      if (optionMatch) {
        // 保存上一个选项的解析
        if (currentOption && currentExplanation) {
          question.optionExplanations[currentOption] = currentExplanation.trim();
        }
        
        const optionKey = optionMatch[1] as 'A' | 'B' | 'C' | 'D';
        const optionText = optionMatch[2].trim();
        question.options[optionKey] = optionText;
        currentOption = optionKey;
        currentExplanation = '';
        isInExplanation = false;
        
        // 检测答案（选项文本中包含"正确"）
        if (optionText.includes('正确')) {
          question.answer = optionKey;
        }
      } else if (line.match(/^[◦•]\s*解析[：:]/) || line.match(/^解析[：:]/)) {
        // 提取解析内容（◦ 解析：或 解析：）
        const explanationText = line.replace(/^[◦•\s]*解析[：:]\s*/, '').trim();
        if (currentOption) {
          currentExplanation = explanationText;
          isInExplanation = true;
        }
      } else if (isInExplanation && currentOption && line) {
        // 继续累积解析内容（多行解析）
        if (currentExplanation) {
          currentExplanation += ' ' + line;
        } else {
          currentExplanation = line;
        }
      } else if (currentOption && line && !line.match(/^[A-D][.、：:]/)) {
        // 如果当前行不是新选项，且不是解析标记，可能是选项文本的延续或解析的开始
        // 检查是否包含"正确"关键字
        if (line.includes('正确') && !question.answer) {
          question.answer = currentOption;
        }
        // 如果还没有解析，可能是解析的开始
        if (!isInExplanation && !currentExplanation) {
          currentExplanation = line;
          isInExplanation = true;
        }
      }
    }
    
    // 保存最后一个选项的解析
    if (currentOption && currentExplanation) {
      question.optionExplanations[currentOption] = currentExplanation.trim();
    }
    
    // 验证选项完整性
    const missingOptions: string[] = [];
    if (!question.options.A) missingOptions.push('A');
    if (!question.options.B) missingOptions.push('B');
    if (!question.options.C) missingOptions.push('C');
    if (!question.options.D) missingOptions.push('D');
    if (missingOptions.length > 0) {
      errors.push(`缺少选项：${missingOptions.join(', ')}`);
    }
    
    if (!question.answer) {
      errors.push('未找到正确答案（应包含"正确"标记）');
    }
  }
  
  // 提取汇总信息
  const reviewStartIndex = blockText.indexOf('本题汇总信息：');
  if (reviewStartIndex !== -1) {
    const reviewSection = blockText.substring(reviewStartIndex + '本题汇总信息：'.length);
    
    // 提取章节（支持【章节】或【章节】：格式）
    const chapterMatch = reviewSection.match(/【章节】[：:]*\s*(.+?)(?:\n|【|$)/s);
    if (chapterMatch) {
      const chapterText = chapterMatch[1].trim();
      question.review.chapter = chapterText;
      question.chapterTitle = chapterText;
      
      // 解析章节号：支持 "Chapter 01 (...)" / "Chapter 1 (...)" / "CHAPTER 1 ..." 等格式
      const chapterNoMatch = chapterText.match(/(?:Chapter|CHAPTER)\s*0*(\d+)/i);
      if (chapterNoMatch) {
        question.chapterNo = parseInt(chapterNoMatch[1], 10);
      } else {
        // 如果没有匹配到标准格式，尝试提取开头的数字
        const numberMatch = chapterText.match(/^0*(\d+)/);
        if (numberMatch) {
          question.chapterNo = parseInt(numberMatch[1], 10);
        } else {
          // 默认设为 0，表示未分类
          question.chapterNo = 0;
          errors.push('无法解析章节号，请使用 "Chapter 1" 或 "CHAPTER 1" 格式');
        }
      }
    } else {
      errors.push('缺少【章节】信息');
      question.chapterNo = 0;
    }
    
    // 提取考点
    const conceptMatch = reviewSection.match(/【考点】[：:]*\s*(.+?)(?:\n|【|$)/s);
    if (conceptMatch) {
      question.review.concept = conceptMatch[1].trim();
    } else {
      errors.push('缺少【考点】信息');
    }
    
    // 提取易混点
    const confusionMatch = reviewSection.match(/【易混点】[：:]*\s*(.+?)(?:\n|【|$)/s);
    if (confusionMatch) {
      question.review.confusionPoint = confusionMatch[1].trim();
    } else {
      errors.push('缺少【易混点】信息');
    }
    
    // 提取易错点
    const errorProneMatch = reviewSection.match(/【易错点】[：:]*\s*(.+?)(?:\n|【|$)/s);
    if (errorProneMatch) {
      question.review.errorPronePoint = errorProneMatch[1].trim();
    } else {
      errors.push('缺少【易错点】信息');
    }
  } else {
    errors.push('缺少"本题汇总信息："标记');
  }
  
  question.errors = errors;
  return question;
}

/**
 * 解析 docx 文件中的所有题目
 */
export async function parseDocxQuestions(file: File): Promise<ParsedQuestion[]> {
  const text = await extractTextFromDocx(file);
  const questionBlocks = splitQuestions(text);
  
  if (questionBlocks.length === 0) {
    throw new Error('未找到任何题目。请确保文档中包含"复述原题："标记。');
  }
  
  return questionBlocks.map((block, index) => parseQuestion(block, index));
}

