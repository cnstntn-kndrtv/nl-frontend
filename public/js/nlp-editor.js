/**
 * Инициализация и запуск редктора ACE в #editor-container
 */
function initACE(){
    var container = document.getElementById('editor-container');
    var demoTxt = "Иванович Иван Иванов";

    editor = ace.edit(container);
    EditSession = require("ace/edit_session").EditSession;
    nlpsession = new EditSession(demoTxt);
    editor.setSession(nlpsession);

    // options
    // тема
    editor.setTheme("ace/theme/katzenmilch");
    
    // это кастомное правило подсветки синтакиса
    // подсвечивает каждое отдельно стоящее слово
    // нужно для выделения по наведению (события редактора ниже в этой же функции)
    editor.session.setMode("ace/mode/single-words-tokens");

    editor.setOptions({
        // фокус страницы на редакторе
        autoScrollEditorIntoView: true,
        // размер шрифта
        fontSize: 14,
        // перенос по словам
        wrap: true,
        // подсвечивать активную линию
        highlightActiveLine: false,
        // подсвечивать выделенное слово
        highlightSelectedWord: true,
        // показывать скрытые символы
        showInvisibles: true,
        // БОКОВАЯЯ ПАНЕЛЬ (СЛЕВА)
        // показывать боковую панель
        showGutter: false,
        // показывать номера строк
        showLineNumbers: false,
        // показывать стрелки свертывание функций
        showFoldWidgets: false,
        // автокомплит
        //enableBasicAutocompletion: false,
        //enableLiveAutocompletion: false,
        // сниппеты
        //enableSnippets: false,
        // порверка правописания
        //spellcheck: true,
        
    });

    // автоматичекое обновление редактора, если включен чекбокс
    var refreshmodechechbox = document.getElementById("refreshmode");
    nlpsession.on("change", function(){
        if(refreshmodechechbox.checked) analyzeText();
    });

    // для обновления подсветки синтаксиса
    Tokenizer = require("ace/tokenizer").Tokenizer;
    BackgroundTokenizer = require("ace/background_tokenizer").BackgroundTokenizer;
    bgTokenizer = new BackgroundTokenizer(nlpsession);

    // для подсветки слов
    Range = ace.require("ace/range").Range;
    var Search = ace.require("ace/search").Search;
    search = new Search();

    // события редактора
    // токены берутся из режима редактора. по-этому подключен режим single-words-token
    
    // левая кнопка мыши
    // editor.on("click", function(){
    //     console.log("ok");
    // })

    // правая кнопка мыши
    // editor.container.addEventListener('contextmenu', function(event) {
    //     event.preventDefault();
    //     var position = editor.getCursorPosition();
    //     var token = editor.session.getTokenAt(position.row, position.column);
    //     console.log(token.value);
    //     return false;
    // }, false);

    // при наведении на слово
    // editor.on('mousemove', function(event) {
    //      var position = event.editor.getCursorPosition();
    //      var token = editor.session.getTokenAt(position.row, position.column);
    //      console.log(token.value);
    //      console.log(position.row, position.column);
    //      console.log("selection:", getSelection());
    // });
}

/**
 * Инициализация AZ и запуск редактора после подгрузки словарей
 * @param  {} '/dicts' словарь
 * @param  {} function() запускается после подгрузки словарей
 */
Az.Morph.init('/dicts', function () {
    // инициализация редактора после загрузки всех словарей
    initACE();
    // панель с анализом 1 слова
    showSingleWordVariants();
});

/**
 * запускает анализатор текста в зависити от выбранного типа в чек-боксе
 */
function analyzeText(){
    var modeMorph = document.getElementById("analysisType-morph").checked;
    var modeToken = document.getElementById("analysisType-token").checked;
    var modeSentiment = document.getElementById("analysisType-sentiment").checked;
    if (modeMorph) updateACEModeMorph();
    if (modeToken) updateACEModeToken();
    if (modeSentiment) updateACEModeSentiment();
}

/**
 * скроллит экран к элементу
 * @param  {string} element id элемента, которому нужно скроллить
 */
function scrollTo(element) {
    $('html, body').animate({scrollTop: $(element).offset().top-60}, 500);
}

/**
 * устанавливает текст заголовка окна с результатами анализа текста
 * @param  {string} header
 */
function changeResultsHeading(header) {
    document.getElementById("results-heading").innerText = header;
}

// МОРФОЛОГИЯ
/**
 * обновляет подсветку синтаксиса тегами результатов Морфлогоческого анализа для ACE 
 */
function updateACEModeMorph() {
    var TextHighlightRules = require("ace/mode/text_highlight_rules").TextHighlightRules;
    var TextHighlightRules = require("ace/mode/text_highlight_rules").TextHighlightRules;
    var rules = new TextHighlightRules;
    // собираются теги из документа в редакторе
    var parse = getMorphTags(nlpsession.getDocument().getValue());
    //debugger;
    if (parse.length != 0) {
        if (parse[0].length != 0) {
            // обновляется список в таблице со словами
            updateMorphWordsList(parse);
            // обновляется подсветка
            rules.addRules(getMorphACEModeRules(parse));
            rules.normalizeRules();
            rules = rules.getRules();
            var tok = new Tokenizer(rules);
            nlpsession.bgTokenizer.setTokenizer(tok);
        } else updateMorphWordsList(null, true); // если в редакторе пусто 
    } else updateMorphWordsList(null, true); // если в редакторе пусто
}

/**
 * Создает правила подсветки синтаксиса Морфологического анализа для ACE редактора
 * @param  {Array.Array.Object} parse
 * @returns {Object} rule
 *   @returns {Object.Array.Object} rule.start содержит массив объектов со список всех слов в правиле {include: word}
 *   @returns {Object.Array.Object} rule.word содержит объект с описаним тегов и регекспа для этого слова
 *     @returns {Object.Array.Object} ule.word[0]["token"] токен для редактора, через точку перечислены все теги
 *     @returns {Object.Array.Object} ule.word[0]["regex"] регексп со словом /word/
 */
function getMorphACEModeRules(parse) {
    // выводится только 1й элемент массива parse, т.к содержит наиболее вероятный вариант
    // составление правила
    var rule = {};
    rule.start = [];
    var word,
        token,
        regex,
        wordRule;
    for (var i = 0, parseLen = parse.length; i < parseLen; i++) {
        if (parse[i][0]) {
            word = parse[i]["origWord"];
            // rule.start с инклудами правил
            rule.start.push({ include: word });
            // название класса CSS
            token = "MORPH.morph_" + parse[i][0]["tag"]["POST"];
            regex = new RegExp("(?!\\s+)" + word + "(?![\\wа-я-]+)");
            wordRule = [
                {
                    token: token,
                    regex: regex,
                    //caseInsensitive: true,
                }
            ]
            rule[word] = wordRule;
        }
    }
    return rule;
}

/**
 * возвращает результаты морфологического анализа
 * @param  {string} text
 * @returns {Array.Array.Object} parse
 */
function getMorphTags(text) {
    // типы токенов для морф. анализа
    var tokenTypes = ["WORD"];
    // разбиение слова на токены
    var tokens = Az.Tokens(text).done(tokenTypes);
    var parse = [];
    var morph;
    // получение морф. тегов для каждого токена
    tokens.map(function (token) {
        morph = Az.Morph(token.toString(), {
            // опечатки 
            typos: 'auto',
            stutter: Infinity,
            ignoreCase: true,
        }); 
        // добавление исходного слова в объект (Az.Morph возвращает слово с исправлениями и в нижнем регистре)
        morph.origWord = token.toString();
        parse.push(morph);
    });
    return parse;
}

// полное описание Морфологических тегов
var morphTagsDescription = {
    "ЧР": "часть речи",
    "СУЩ": "имя существительное",
    "ПРИЛ": "имя прилагательное (полное)",
    "КР_ПРИЛ": "имя прилагательное (краткое)",
    "КОМП": "компаратив",
    "ГЛ": "глагол (личная форма)",
    "ИНФ": "глагол (инфинитив)",
    "ПРИЧ": "причастие (полное)",
    "КР_ПРИЧ": "причастие (краткое)",
    "ДЕЕПР": "деепричастие",
    "ЧИСЛ": "числительное",
    "Н": "наречие",
    "МС": "местоимение-существительное",
    "ПРЕДК": "предикатив",
    "ПР": "предлог",
    "СОЮЗ": "союз",
    "ЧАСТ": "частица",
    "МЕЖД": "междометие",
    "Од-неод": "одушевлённость / одушевлённость не выражена",
    "од": "одушевлённое",
    "неод": "неодушевлённое",
    "хр": "род / род не выражен",
    "мр": "мужской род",
    "жр": "женский род",
    "ср": "средний род",
    "ор": "общий род",
    "Число": "число",
    "ед": "единственное число",
    "мн": "множественное число",
    "sg": "singularia tantum",
    "pl": "pluralia tantum",
    "0": "неизменяемое число",
    "Падеж": "категория падежа",
    "им": "именительный падеж",
    "рд": "родительный падеж",
    "дт": "дательный падеж",
    "вн": "винительный падеж",
    "тв": "творительный падеж",
    "пр": "предложный падеж",
    "зв": "звательный падеж",
    "рд1": "первый родительный падеж",
    "рд2": "второй родительный (частичный) падеж",
    "вн2": "второй винительный падеж",
    "пр1": "первый предложный падеж",
    "пр2": "второй предложный (местный) падеж",
    "аббр": "аббревиатура",
    "имя": "имя",
    "фам": "фамилия",
    "отч": "отчество",
    "гео": "топоним",
    "орг": "организация",
    "tm": "торговая марка",
    "субст?": "возможна субстантивация",
    "превосх": "превосходная степень",
    "кач": "качественное",
    "мест-п": "местоименное",
    "числ-п": "порядковое",
    "притяж": "притяжательное",
    "*ею": "форма на -ею",
    "*ою": "форма на -ою",
    "сравн2": "сравнительная степень на по-",
    "*ей": "форма компаратива на -ей",
    "Вид": "категория вида",
    "сов": "совершенный вид",
    "несов": "несовершенный вид",
    "Перех": "категория переходности",
    "перех": "переходный",
    "неперех": "непереходный",
    "безл": "безличный",
    "безл?": "возможно безличное употребление",
    "мног": "многократный",
    "возвр": "возвратный",
    "Лицо": "категория лица",
    "1л": "1 лицо",
    "2л": "2 лицо",
    "3л": "3 лицо",
    "Время": "категория времени",
    "наст": "настоящее время",
    "прош": "прошедшее время",
    "буд": "будущее время",
    "Накл": "категория наклонения",
    "изъяв": "изъявительное наклонение",
    "повел": "повелительное наклонение",
    "Совм": "категория совместности",
    "вкл": "говорящий включён (идем, идемте)",
    "выкл": "говорящий не включён в действие (иди, идите)",
    "Залог": "категория залога",
    "действ": "действительный залог",
    "страд": "страдательный залог",
    "разг": "разговорное",
    "жарг": "жаргонное",
    "арх": "устаревшее",
    "лит": "литературный вариант",
    "опеч": "опечатка",
    "искаж": "искажение",
    "вопр": "вопросительное",
    "указ": "указательное",
    "вводн": "вводное слово",
    "*ье": "форма на -ье",
    "*енен": "форма на -енен",
    "*ие": "отчество через -ие-",
    "*ьи": "форма на -ьи",
    "*несов": "деепричастие от глагола несовершенного вида",
    "предк?": "может выступать в роли предикатива",
    "счетн": "счётная форма",
    "собир": "собирательное числительное",
    "*ши": "деепричастие на -ши",
    "*предл": "форма после предлога",
    "не/одуш?": "может использоваться как одуш. / неодуш.",
    "в_предл": "Вариант предлога ( со, подо, ...)",
    "Анаф": "Анафорическое (местоимение)",
    "иниц": "Инициал",
    "прил?": "может выступать в роли прилагательного"
};

/**
 * создает строчку с тегами на русском языке + tooltip с полным описаним из tagsDescription
 * после создания для всех слов, нужно инициализировать тултипы в вызывающей функции $('[data-toggle="tooltip"]').tooltip(); 
 * @param  {obj} tags теги на русском языке, разделены запятой
 * @returns {string} result html span
 */
function createMorphTagsString(tags) {
    var result = '';
    for (tag in tags) {
        if(typeof(tags[tag]) == "boolean") {
            result += '<span style="cursor: pointer" data-toggle="tooltip" data-placement="top" container="body" title="' + morphTagsDescription[tag] + '">[' + tag + ']</span>';
        }
    }
    return result;
}

/**
 * обнвляет список слов с результатами Морфологического анализа текста
 * @param  {Object} parse
 * @param  {[boolean]} hideResults если установлен - скрывает таблицу с результатами 
 */
function updateMorphWordsList(parse, hideResults) {
    var wordsContainer = document.getElementById("words-container");
    changeResultsHeading("Результаты морфологического анализа (наибольшая вероятность)")
    if (hideResults) {
        wordsContainer.innerHTML = "";
        return;
    } 
    var wordsContent = "";
    var str,
        origWord,
        correctedWord,
        tagStr,
        badge;

    for (var i = 0, l = parse.length; i < l; i++) {
        if (parse[i][0]) {
            origWord = parse[i]["origWord"];
            correctedWord = parse[i][0]["word"];
            tagStr = createMorphTagsString(parse[i][0]["tag"]["ext"]);
            badge = '<span class="badge ace_MORPH ace_morph_' + parse[i][0]["tag"]["POST"] + '">' + parse[i][0]["tag"]["ext"]["POST"] + '</span>';
            str =
                '<tr>\
                    <td>\
                        <a style="cursor: pointer" onclick="scrollTo(\'#single-word\'); document.getElementById(\'single-word\').value = \'' + origWord + '\'; document.getElementById(\'single-word\').focus();">'
                            + origWord +
                        '</a>\
                    </td>\
                    <td>'
                        + correctedWord +
                    '</td>\
                    <td>'
                        + badge +
                    '</td>\
                    <td>'
                        + tagStr +
                    '</td>\
                    <td>'
                        + (parse[i][0].stutterCnt || 0) +
                    '</td>\
                    <td>'
                        + (parse[i][0].typosCnt || 0) +
                    '</td>\
                    <td>'
                        + (parse[i][0].stutterCnt || 0) +
                    '</td>\
                </tr>';

            wordsContent += str;
        }
    }
    wordsContainer.innerHTML = '<div class="table-responsive">\
                                    <table class="table table-hover table-condensed">\
                                        <thead>\
                                            <tr>\
                                                <th>Слово</th>\
                                                <th>Исправление</th>\
                                                <th>Части речи</th>\
                                                <th>Все теги</th>\
                                                <th>Испр. повторов</th>\
                                                <th>Испр. опечаток</th>\
                                                <th>Испр. заиканий</th>\
                                            </tr>\
                                        </thead>\
                                        <tbody>' + wordsContent + '</tbody>\
                                    </table>\
                                </div>';

    $('[data-toggle="tooltip"]').tooltip();
}

// ТОКЕНИЗАЦИЯ
/**
 * обновляет подсветку синтаксиса тегами результатов Токенизации текста для ACE 
 */
function updateACEModeToken(){
    var TextHighlightRules = require("ace/mode/text_highlight_rules").TextHighlightRules;
    var TextHighlightRules = require("ace/mode/text_highlight_rules").TextHighlightRules;
    var rules = new TextHighlightRules;
    // собираются теги из документа в редакторе
    var tokens = getTokenTags(nlpsession.getDocument().getValue());
    if (tokens.length != 0) {
        // обновляется список в таблице со словами
        updateTokenWordsList(tokens);
        // обновляется подсветка
        rules.addRules(getTokensACEModeRules(tokens));
        rules.normalizeRules();
        rules = rules.getRules();
        var tok = new Tokenizer(rules);
        nlpsession.bgTokenizer.setTokenizer(tok);
    } else updateMorphWordsList(null, true); // если в редакторе пусто
}

/**
 * возвращает токены текста
 * @param  {string} text
 * @returns {Array.Object} tokens
 */
function getTokenTags(text) {
    var tokens = Az.Tokens(text).done();
    return(tokens);
}

/**
 * Создает правила подсветки синтаксиса Токенизации для ACE редактора
 * @param  {Array.Object} tokens
 * @returns {Object} rule
 *   @returns {Object.Array.Object} rule.start содержит массив объектов со список всех слов в правиле {include: word}
 *   @returns {Object.Array.Object} rule.word содержит объект с описаним тегов и регекспа для этого слова
 *     @returns {Object.Array.Object} ule.word[0]["token"] токен для редактора, через точку перечислены все теги
 *     @returns {Object.Array.Object} ule.word[0]["regex"] регексп со словом /word/
 */
function getTokensACEModeRules(tokens) {
    // выводится только 1й элемент массива parse, т.к содержит наиболее вероятный вариант
    // составление правила
    var rule = {};
    rule.start = [];
    var word,
        tokenType,
        tokenSubType,
        token,
        regex,
        wordRule;
    for (var i = 0, l = tokens.length; i < l; i++) {
        if (tokens[i]) {
            word = tokens[i].toString();
            if (word) {
                // rule.start с инклудами правил
                rule.start.push({ include: word });
                // названия классов CSS для тега и саб тега
                tokenType = tokens[i].type ? ".token_" + tokens[i].type.toString() : "";
                tokenSubType = tokens[i].subType ? ".token_" + tokens[i].subType.toString() : "";
                token = "TOKENS" + tokenType + tokenSubType;
                if (tokenType != ".token_SPACE" && tokenType != ".token_PUNCT" && tokenType != ".token_OTHER") {
                    regex = new RegExp("(?!\\s+)" + word + "(?![\\wа-я-]+)");
                } else regex = new RegExp("\\" + word);
                
                wordRule = [
                    {
                        token: token,
                        regex: regex,
                        //caseInsensitive: true,
                    }
                ]
                rule[word] = wordRule;
            }
        }
    }
    return rule;
}

/**
 * обнвляет список слов с результатами Токенизации текста
 * @param  {Object} parse
 * @param  {[boolean]} hideResults если установлен - скрывает таблицу с результатами 
 */
function updateTokenWordsList(tokens, hideResults) {
    var wordsContainer = document.getElementById("words-container");
    changeResultsHeading("Результаты токенизации текста")
    if (hideResults) {
        wordsContainer.innerHTML = "";
        return;
    }
    var wordsContent = "";
    var str,
        word,
        tokenType,
        tokenSubType,
        tokenTypeClazz,
        tokenSubTypeClazz,
        tagStr,
        badge;

    for (var i = 0, l = tokens.length; i < l; i++) {
        if (tokens[i]) {
            word = tokens[i].toString();
            // названия токена и субтокена
            tokenType = tokens[i].type ? tokens[i].type.toString() : false;
            tokenSubType = tokens[i].subType ? tokens[i].subType.toString() : false;
            // классы css для подсветки
            tokenTypeClazz = tokenType ? "ace_token_" + tokenType : "";
            tokenSubTypeClazz = tokenSubType ? "ace_token_" + tokenSubType : "";
            // строчка с названиями тега и сабтега
            tagStr = '<span>' + (tokenType ? '[' + tokenType + ']' : "") + (tokenSubType ? '[' + tokenSubType + ']' : "") + '</span>';
            badge = '<span class="badge ace_TOKENS ' + tokenTypeClazz + '">' + tokenType + '</span>';
            str =
                '<tr>\
                    <td>"' + word + '"</td>\
                    <td>'
                        + badge +
                    '</td>\
                    <td>'
                        + tagStr +
                    '</td>\
                </tr>';

            wordsContent += str;
        }
    }

    wordsContainer.innerHTML = '<table class="table table-hover table-condensed">\
                                    <thead>\
                                        <tr>\
                                            <th>Слово</th>\
                                            <th>Основной тег</th>\
                                            <th>Все теги</th>\
                                        </tr>\
                                    </thead>\
                                    <tbody>' + wordsContent + '</tbody>\
                                </table>';

}

// ЭМОЦИИ
function updateACEModeSentiment(){
    updateMorphWordsList(null, true);
}

// МОРФОЛОГИЧЕСКИЙ АНАЛИЗ 1 СЛОВА
/**
 * показывает панель с результатами анализа 1 слова
 */
function showSingleWordVariants(){
    document.getElementById("single-word-variants").style.visibility = "visible";
}

/**
 * обновляет таблицу с результатами Морф. анализа одного слова
 * слов берет из инпута #single-word
 */
function updateSingleWordMorphVariants() {
    var variants = Az.Morph(document.getElementById('single-word').value, { typos: 'auto' });
    var container = document.getElementById("single-word-variants-results");
    var content = "";
    var str;
    var formsLink;
    var allForms = "";
    var allFormContainer;
    var allFormsList;
    var allFormsListRow;
    for (var i = 0, l = variants.length; i < l; i++) {
        if (variants[i].formCnt) formsLink = '<a style="cursor: pointer" onclick="showAllForms(' + i + ')">' + variants[i].formCnt + ' ' + Az.Morph('форма')[0].pluralize(variants[i].formCnt) + '</a>';
        else formsLink = 'Нет форм';
        str =   '<tr>\
                    <td>' + variants[i] + '</td>\
                    <td>' + Math.floor(variants[i].score.toFixed(6) * 100) + '% </td>\
                    <td>' + variants[i].parser + '</td>\
                    <td>' + createMorphTagsString(variants[i].tag.ext) + '</td>\
                    <td>' + variants[i].tag + '</td>\
                    <td>' + variants[i].normalize() + '</td>\
                    <td>' + variants[i].normalize(true) + '</td>\
                    <td>' + (variants[i].stutterCnt || 0) + '</td>\
                    <td>' + (variants[i].typosCnt || 0) + '</td>\
                    <td>' + formsLink +'</td>\
                </tr>';
        // составление списка всех форм каждого варианта слова
        allFormsList = "";
        for (var f = 0, n = 0; f < variants[i].formCnt; f++) {
            var form = variants[i].inflect(f)
            n = f + 1;
            allFormsListRow =  '<tr>\
                                    <td>' + n + '</td>\
                                    <td>' + form + '</td>\
                                    <td>' + createMorphTagsString(form.tag.ext) + '</td>\
                                </tr>';

            allFormsList += allFormsListRow;
        }

        // создание модельного окна со списком всех форм для каждого варианта слова
        allFormContainer = '<div class="modal" id="allForms-' + i + '">\
                                <div class="modal-dialog">\
                                    <div class="modal-content">\
                                        <div class="modal-header">\
                                            <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>\
                                            <h4 class="modal-title">Формы слова "' + variants[i] + '" (' + variants[i].formCnt + ')</h4>\
                                        </div>\
                                        <div class="modal-body">\
                                            <div class="scrollable" id="all-forms-table">\
                                                <table class="table">\
                                                    <thead>\
                                                        <tr>\
                                                            <td></td>\
                                                            <td>Слово</td>\
                                                            <td>Граммемы</td>\
                                                        </tr>\
                                                    </thead>\
                                                    <tbody>' + allFormsList + '</tbody>\
                                                </table>\
                                            </div>\
                                        </div>\
                                        <div class="modal-footer">\
                                            <button type="button" class="btn btn-default" data-dismiss="modal">Закрыть</button>\
                                        </div>\
                                    </div>\
                                </div>\
                            </div>';

      content += str;
      allForms += allFormContainer
    }
    container.innerHTML =   '<div class="table-responsive">\
                                <table class="table table-hover">\
                                    <thead>\
                                        <tr>\
                                            <th>Слово</th>\
                                            <th>%</th>\
                                            <th>Парсер</th>\
                                            <th>Граммемы</th>\
                                            <th>Граммемы (англ.)</th>\
                                            <th>Нач.форма</th>\
                                            <th>Нач.форма(та же ч.р.)</th>\
                                            <th>Испр. повторов</th>\
                                            <th>Испр опечаток</th>\
                                            <th>Все формы слова</th>\
                                        </tr>\
                                    <tbody>' + content + '</tbody>\
                                </tabe>\
                            </div>';
    document.getElementById("single-word-modals").innerHTML = allForms;
    $('[data-toggle="tooltip"]').tooltip();
}

/**
 * показывает модульное окно со всеми формами одного слова
 * окно создается в функции updateSingleWordMorphVariants
 * @param  {number} i - номер окна #allForms-i
 */
function showAllForms(i){
    var formId = "#allForms-" + i;
    $(formId).modal('show');
    console.log(formId);
}






/// ДЛЯ ТЕСТОВ
function test(){
    highlightWord();
}
function test2(){
    unhighlightWord();
}
var currentMarker;
function highlightWord(word){
    unhighlightWord();
    search.setOptions({
        // слово или регекс, если регексп - становить флажок
        needle: "Иван",
        caseSensitive: true,
        // использует \b
        wholeWord: false,
        regExp: false
    })
    var range = search.find(nlpsession);
    
    if (range) currentMarker = nlpsession.addMarker(range, "errorUnderline", "text");
    console.log(currentMarker);
}

function unhighlightWord(){
    nlpsession.removeMarker(currentMarker);
    console.log(currentMarker);
}