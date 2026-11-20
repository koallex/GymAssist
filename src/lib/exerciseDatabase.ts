/**
 * Библиотека упражнений. Чтобы добавить упражнение — добавьте вызов ex(...) в EXERCISES.
 * rank: меньше = приоритетнее при выборе алгоритмом.
 * secondary: косвенная нагрузка (доля от прямого подхода).
 */
import type {
  Difficulty, Equipment, Exercise, ExerciseCategory, JointTag, MovementPattern, MuscleId,
} from './types';

type Extra = Partial<Pick<Exercise, 'fatigue' | 'timed' | 'repStyle' | 'mainLift' | 'unilateral'>>;
type Sec = Partial<Record<MuscleId, number>>;

function ex(
  id: string, nameRu: string, nameEn: string, primary: MuscleId, pattern: MovementPattern,
  category: ExerciseCategory, equipment: Equipment[], difficulty: Difficulty, rank: number,
  secondary: Sec, joints: JointTag[], instruction: string, extra: Extra = {},
): Exercise {
  return {
    id, nameRu, nameEn, primary, pattern, category, equipment, difficulty, rank, secondary, joints,
    instruction, illustration: pattern, fatigue: category === 'compound' ? 2 : 1, ...extra,
  };
}

export const EXERCISES: Exercise[] = [
  // ───── Грудные ─────
  ex('bench-press', 'Жим штанги лёжа', 'Barbell Bench Press', 'chest', 'horizontal_push', 'compound', ['barbell', 'bench'], 2, 1,
    { triceps: 0.5, frontDelts: 0.3 }, ['shoulder'],
    'Лопатки сведены, стопы на полу. Опускайте штангу к середине груди, выжимайте вверх, не отрывая таз.', { mainLift: true }),
  ex('db-bench-press', 'Жим гантелей лёжа', 'Dumbbell Bench Press', 'chest', 'horizontal_push', 'compound', ['dumbbell', 'bench'], 1, 1.5,
    { triceps: 0.5, frontDelts: 0.3 }, ['shoulder'],
    'Гантели над грудью, локти под углом около 45° к корпусу. Опускайте до растяжения груди и выжимайте вверх.'),
  ex('machine-chest-press', 'Жим в тренажёре сидя', 'Machine Chest Press', 'chest', 'horizontal_push', 'compound', ['machine'], 1, 1.8,
    { triceps: 0.5, frontDelts: 0.3 }, [],
    'Спина прижата, рукоятки на уровне середины груди. Выжимайте плавно, без рывка и полного выпрямления в локтях.'),
  ex('smith-bench-press', 'Жим в Смите лёжа', 'Smith Machine Bench Press', 'chest', 'horizontal_push', 'compound', ['machine', 'bench'], 1, 2.5,
    { triceps: 0.5, frontDelts: 0.3 }, ['shoulder'],
    'Скамья по центру грифа. Опускайте штангу к нижней части груди, лопатки сведены.'),
  ex('push-up', 'Отжимания от пола', 'Push-Up', 'chest', 'horizontal_push', 'compound', ['bodyweight'], 1, 3,
    { triceps: 0.5, frontDelts: 0.3, core: 0.3 }, ['wrist'],
    'Тело — прямая линия, локти под 45°. Опускайтесь до касания грудью (или почти), если тяжело — упор руками на опору.'),
  ex('incline-bb-press', 'Жим штанги на наклонной скамье', 'Incline Barbell Press', 'chest', 'incline_push', 'compound', ['barbell', 'bench'], 2, 1,
    { frontDelts: 0.5, triceps: 0.5 }, ['shoulder'],
    'Наклон скамьи 30°. Опускайте штангу к верху груди, не разводя локти широко.'),
  ex('incline-db-press', 'Жим гантелей на наклонной скамье', 'Incline Dumbbell Press', 'chest', 'incline_push', 'compound', ['dumbbell', 'bench'], 1, 1.5,
    { frontDelts: 0.5, triceps: 0.5 }, ['shoulder'],
    'Наклон 30°. Акцент смещается на верх груди. Опускайте гантели контролируемо, не вращая плечи вперёд.'),
  ex('chest-dip', 'Отжимания на брусьях (грудь)', 'Chest Dip', 'chest', 'dip', 'compound', ['bodyweight'], 2, 3,
    { triceps: 0.6, frontDelts: 0.4 }, ['shoulder', 'elbow'],
    'Корпус слегка наклонён вперёд. Опускайтесь до комфортной глубины, без боли в плечах.'),
  ex('cable-fly', 'Сведение рук в кроссовере', 'Cable Fly', 'chest', 'chest_fly', 'isolation', ['cable'], 1, 1.5,
    { frontDelts: 0.2 }, ['shoulder'],
    'Лёгкий сгиб в локтях зафиксирован. Сводите руки дугой перед грудью, в конце на секунду сожмите грудные.'),
  ex('pec-deck', 'Сведение рук в тренажёре «бабочка»', 'Pec Deck', 'chest', 'chest_fly', 'isolation', ['machine'], 1, 1.2,
    { frontDelts: 0.2 }, [],
    'Спина прижата, локти на уровне груди. Сводите без рывка, в растяжении не заводите плечи назад слишком далеко.'),

  // ───── Широчайшие ─────
  ex('lat-pulldown', 'Тяга верхнего блока к груди', 'Lat Pulldown', 'lats', 'vertical_pull', 'compound', ['cable'], 1, 1,
    { biceps: 0.35, upperBack: 0.3 }, ['shoulder'],
    'Тяните рукоятку к верху груди, сводя лопатки вниз. Не раскачивайтесь корпусом.'),
  ex('pull-up', 'Подтягивания', 'Pull-Up', 'lats', 'vertical_pull', 'compound', ['bodyweight'], 3, 1.2,
    { biceps: 0.35, upperBack: 0.3, forearms: 0.2 }, ['shoulder', 'elbow'],
    'Полный вис, подтягивайтесь до уровня подбородка над перекладиной, плавно опускайтесь.', { mainLift: true }),
  ex('assisted-pull-up', 'Подтягивания в гравитроне', 'Assisted Pull-Up', 'lats', 'vertical_pull', 'compound', ['machine'], 1, 2,
    { biceps: 0.35, upperBack: 0.3 }, ['shoulder'],
    'Подберите помощь так, чтобы выполнять 8–12 повторений с хорошей техникой. Постепенно снижайте помощь.'),
  ex('straight-arm-pulldown', 'Пуловер на блоке прямыми руками', 'Straight-Arm Pulldown', 'lats', 'lat_isolation', 'isolation', ['cable'], 1, 1,
    { }, ['shoulder'],
    'Руки почти прямые, тяните рукоятку дугой к бёдрам, чувствуя работу широчайших.'),
  ex('db-pullover', 'Пуловер с гантелью', 'Dumbbell Pullover', 'lats', 'lat_isolation', 'isolation', ['dumbbell', 'bench'], 2, 2,
    { chest: 0.3, triceps: 0.2 }, ['shoulder'],
    'Гантель двумя руками над грудью, опускайте за голову до комфортного растяжения и возвращайте дугой.'),

  // ───── Верх спины и трапеции ─────
  ex('barbell-row', 'Тяга штанги в наклоне', 'Barbell Row', 'upperBack', 'horizontal_pull', 'compound', ['barbell'], 2, 1.2,
    { lats: 0.5, biceps: 0.35, rearDelts: 0.5, forearms: 0.2 }, ['lowBack'],
    'Корпус наклонён, спина ровная. Тяните штангу к низу живота, сводя лопатки.'),
  ex('seated-cable-row', 'Тяга нижнего блока сидя', 'Seated Cable Row', 'upperBack', 'horizontal_pull', 'compound', ['cable'], 1, 1,
    { lats: 0.5, biceps: 0.35, rearDelts: 0.4 }, [],
    'Корпус неподвижен. Тяните рукоятку к животу, сводите лопатки, возвращайте плавно.'),
  ex('chest-supported-row', 'Тяга в тренажёре с упором в грудь', 'Chest-Supported Row', 'upperBack', 'horizontal_pull', 'compound', ['machine'], 1, 1.2,
    { lats: 0.5, biceps: 0.35, rearDelts: 0.5 }, [],
    'Грудь прижата к упору — нижняя часть спины разгружена. Тяните локти назад и сводите лопатки.'),
  ex('db-row', 'Тяга гантели одной рукой', 'One-Arm Dumbbell Row', 'upperBack', 'horizontal_pull', 'compound', ['dumbbell', 'bench'], 1, 1.5,
    { lats: 0.5, biceps: 0.35, rearDelts: 0.4 }, [],
    'Опора рукой и коленом на скамью. Тяните гантель к поясу, локоть идёт вдоль корпуса.', { unilateral: true }),
  ex('inverted-row', 'Горизонтальная тяга собственного веса', 'Inverted Row', 'upperBack', 'horizontal_pull', 'compound', ['bodyweight'], 1, 3,
    { lats: 0.5, biceps: 0.35, rearDelts: 0.4 }, [],
    'Тело — прямая линия под низкой перекладиной. Подтягивайте грудь к грифу, сводя лопатки. Чем горизонтальнее тело, тем тяжелее.'),
  ex('db-shrug', 'Шраги с гантелями', 'Dumbbell Shrug', 'upperBack', 'shrug', 'isolation', ['dumbbell'], 1, 1,
    { forearms: 0.2 }, [],
    'Поднимайте плечи вверх к ушам, на секунду задержитесь, без вращения плечами.'),

  // ───── Передние дельты (жимы над головой) ─────
  ex('overhead-press', 'Жим штанги стоя', 'Overhead Press', 'frontDelts', 'vertical_push', 'compound', ['barbell'], 2, 1,
    { triceps: 0.5, sideDelts: 0.5, core: 0.3 }, ['shoulder', 'lowBack'],
    'Ягодицы и пресс напряжены, не прогибайтесь в пояснице. Выжимайте штангу над головой по прямой.', { mainLift: true }),
  ex('db-shoulder-press', 'Жим гантелей сидя', 'Seated Dumbbell Shoulder Press', 'frontDelts', 'vertical_push', 'compound', ['dumbbell', 'bench'], 1, 1.2,
    { triceps: 0.5, sideDelts: 0.5 }, ['shoulder'],
    'Спинка скамьи вертикальна, спина прижата. Выжимайте гантели вверх и сводите их над головой.'),
  ex('machine-shoulder-press', 'Жим от плеч в тренажёре', 'Machine Shoulder Press', 'frontDelts', 'vertical_push', 'compound', ['machine'], 1, 1.5,
    { triceps: 0.5, sideDelts: 0.5 }, ['shoulder'],
    'Регулируйте сиденье так, чтобы рукоятки были на уровне плеч. Выжимайте плавно.'),
  ex('front-raise', 'Подъём гантелей перед собой', 'Dumbbell Front Raise', 'frontDelts', 'front_raise', 'isolation', ['dumbbell'], 1, 1,
    { }, ['shoulder'],
    'Поднимайте гантели до уровня плеч, без раскачки корпусом.'),

  // ───── Средние дельты ─────
  ex('db-lateral-raise', 'Махи гантелями в стороны', 'Dumbbell Lateral Raise', 'sideDelts', 'lateral_raise', 'isolation', ['dumbbell'], 1, 1.2,
    { }, ['shoulder'],
    'Лёгкий сгиб в локтях. Поднимайте руки до уровня плеч, локти выше кистей, без рывка.', { repStyle: 'high' }),
  ex('cable-lateral-raise', 'Отведение руки в блоке в сторону', 'Cable Lateral Raise', 'sideDelts', 'lateral_raise', 'isolation', ['cable'], 1, 1,
    { }, ['shoulder'],
    'Стойте боком к блоку, отводите руку в сторону до уровня плеча. Постоянное натяжение троса.', { repStyle: 'high', unilateral: true }),
  ex('machine-lateral-raise', 'Махи в тренажёре в стороны', 'Machine Lateral Raise', 'sideDelts', 'lateral_raise', 'isolation', ['machine'], 1, 1.5,
    { }, ['shoulder'],
    'Локти упираются в подушки. Поднимайте до уровня плеч, медленно опускайте.', { repStyle: 'high' }),

  // ───── Задние дельты ─────
  ex('face-pull', 'Тяга каната к лицу', 'Face Pull', 'rearDelts', 'rear_delt_fly', 'isolation', ['cable'], 1, 1,
    { upperBack: 0.3 }, [],
    'Блок на уровне лица. Тяните канат к лицу, разводя руки в стороны и сводя лопатки.', { repStyle: 'high' }),
  ex('reverse-pec-deck', 'Обратные разведения в тренажёре', 'Reverse Pec Deck', 'rearDelts', 'rear_delt_fly', 'isolation', ['machine'], 1, 1.2,
    { upperBack: 0.3 }, [],
    'Грудь прижата к упору. Разводите руки в стороны на уровне плеч, не помогая спиной.', { repStyle: 'high' }),
  ex('db-reverse-fly', 'Разведения гантелей в наклоне', 'Bent-Over Dumbbell Reverse Fly', 'rearDelts', 'rear_delt_fly', 'isolation', ['dumbbell'], 2, 2,
    { upperBack: 0.3 }, ['lowBack'],
    'Наклон корпуса, спина ровная. Разводите гантели в стороны до уровня плеч.', { repStyle: 'high' }),

  // ───── Бицепс ─────
  ex('db-curl', 'Подъём гантелей на бицепс', 'Dumbbell Curl', 'biceps', 'elbow_flexion', 'isolation', ['dumbbell'], 1, 1,
    { forearms: 0.2 }, ['elbow'],
    'Локти прижаты к корпусу. Поднимайте гантели без раскачки, опускайте медленно.'),
  ex('bb-curl', 'Подъём штанги на бицепс', 'Barbell Curl', 'biceps', 'elbow_flexion', 'isolation', ['barbell'], 1, 1.2,
    { forearms: 0.2 }, ['elbow', 'wrist'],
    'Корпус неподвижен, локти у корпуса. Если неудобно запястьям — используйте гантели.'),
  ex('hammer-curl', 'Сгибания «молот»', 'Hammer Curl', 'biceps', 'elbow_flexion', 'isolation', ['dumbbell'], 1, 1.5,
    { forearms: 0.3 }, ['elbow'],
    'Нейтральный хват (ладони друг к другу). Поднимайте без раскачки.'),
  ex('cable-curl', 'Сгибание рук на нижнем блоке', 'Cable Curl', 'biceps', 'elbow_flexion', 'isolation', ['cable'], 1, 1.5,
    { forearms: 0.2 }, ['elbow'],
    'Блок внизу, локти у корпуса. Постоянное натяжение троса на всей амплитуде.'),
  ex('incline-db-curl', 'Подъём гантелей на наклонной скамье', 'Incline Dumbbell Curl', 'biceps', 'elbow_flexion', 'isolation', ['dumbbell', 'bench'], 2, 2,
    { forearms: 0.2 }, ['elbow', 'shoulder'],
    'Лёжа на наклонной скамье, руки свободно опущены. Растяжение бицепса в нижней точке, без рывка.'),

  // ───── Трицепс ─────
  ex('cable-pushdown', 'Разгибание рук на верхнем блоке', 'Triceps Pushdown', 'triceps', 'elbow_extension', 'isolation', ['cable'], 1, 1,
    { }, ['elbow'],
    'Локти прижаты к корпусу. Разгибайте руки вниз, не помогая плечами.'),
  ex('overhead-db-extension', 'Французский жим гантели из-за головы', 'Overhead Dumbbell Extension', 'triceps', 'elbow_extension', 'isolation', ['dumbbell'], 1, 1.2,
    { }, ['elbow', 'shoulder'],
    'Гантель двумя руками над головой, локти смотрят вверх. Опускайте за голову и разгибайте.'),
  ex('skull-crusher', 'Французский жим лёжа', 'Skull Crusher', 'triceps', 'elbow_extension', 'isolation', ['barbell', 'bench'], 2, 2,
    { }, ['elbow'],
    'Локти неподвижны, опускайте гриф к лбу или за голову, разгибайте без разведения локтей.'),
  ex('bench-dip', 'Обратные отжимания от скамьи', 'Bench Dip', 'triceps', 'elbow_extension', 'compound', ['bodyweight', 'bench'], 1, 3,
    { chest: 0.3, frontDelts: 0.3 }, ['shoulder', 'elbow'],
    'Руки на скамье за спиной, опускайтесь до угла в локтях около 90°. При дискомфорте в плечах — замените.'),
  ex('close-grip-bench', 'Жим штанги узким хватом', 'Close-Grip Bench Press', 'triceps', 'close_grip_press', 'compound', ['barbell', 'bench'], 2, 3,
    { chest: 0.5, frontDelts: 0.4 }, ['elbow', 'shoulder', 'wrist'],
    'Хват чуть уже плеч, локти ближе к корпусу. Опускайте штангу к нижней части груди.'),

  // ───── Предплечья ─────
  ex('wrist-curl', 'Сгибание кистей с гантелью', 'Wrist Curl', 'forearms', 'wrist', 'isolation', ['dumbbell', 'bench'], 1, 1,
    { }, ['wrist'],
    'Предплечья лежат на скамье, кисти свисают. Сгибайте кисти вверх, плавно опускайте.', { repStyle: 'high' }),
  ex('reverse-curl', 'Обратные сгибания рук со штангой', 'Reverse Curl', 'forearms', 'wrist', 'isolation', ['barbell'], 1, 1.5,
    { biceps: 0.4 }, ['wrist', 'elbow'],
    'Хват сверху. Локти у корпуса, поднимайте без раскачки.'),
  ex('farmer-walk', 'Прогулка фермера', "Farmer's Walk", 'forearms', 'carry', 'isolation', ['dumbbell'], 1, 1,
    { core: 0.3, upperBack: 0.3 }, [],
    'Крепко держите тяжёлые гантели, осанка прямая, идите ровным шагом 20–40 секунд.', { timed: true }),

  // ───── Квадрицепсы ─────
  ex('back-squat', 'Приседания со штангой на плечах', 'Barbell Back Squat', 'quads', 'squat', 'compound', ['barbell'], 2, 1,
    { glutes: 0.5, hamstrings: 0.2, core: 0.3 }, ['knee', 'lowBack'],
    'Штанга на верхней части спины, стопы на ширине плеч. Садитесь до комфортной глубины, колени по линии носков, спина нейтральна.',
    { mainLift: true, fatigue: 3 }),
  ex('front-squat', 'Фронтальные приседания', 'Front Squat', 'quads', 'squat', 'compound', ['barbell'], 3, 2.5,
    { glutes: 0.4, core: 0.4 }, ['knee', 'wrist'],
    'Штанга на передних дельтах, локти высоко. Корпус вертикальнее, чем в обычном приседе.', { fatigue: 3 }),
  ex('goblet-squat', 'Гоблет-присед', 'Goblet Squat', 'quads', 'squat', 'compound', ['dumbbell'], 1, 1.5,
    { glutes: 0.5, core: 0.3 }, ['knee'],
    'Гантель у груди двумя руками. Садитесь вниз между коленями, корпус вертикален.'),
  ex('leg-press', 'Жим ногами', 'Leg Press', 'quads', 'squat', 'compound', ['machine'], 1, 1.2,
    { glutes: 0.3, hamstrings: 0.2 }, ['knee'],
    'Поясница прижата, колени по линии носков. Не выпрямляйте колени до конца и не отрывайте таз.'),
  ex('hack-squat', 'Гакк-приседания в тренажёре', 'Hack Squat', 'quads', 'squat', 'compound', ['machine'], 2, 1.5,
    { glutes: 0.3 }, ['knee'],
    'Спина прижата к подушке. Приседайте до комфортной глубины, пятки на платформе.'),
  ex('smith-squat', 'Приседания в Смите', 'Smith Machine Squat', 'quads', 'squat', 'compound', ['machine'], 1, 2,
    { glutes: 0.5 }, ['knee'],
    'Стопы чуть впереди грифа. Присед до комфортной глубины, спина нейтральна.'),
  ex('bulgarian-split-squat', 'Болгарские сплит-приседания', 'Bulgarian Split Squat', 'quads', 'lunge', 'compound', ['dumbbell', 'bench'], 2, 1.5,
    { glutes: 0.6, hamstrings: 0.2 }, ['knee', 'hip'],
    'Задняя нога на скамье. Опускайтесь вертикально вниз, вес на передней ноге.', { unilateral: true }),
  ex('db-lunge', 'Выпады с гантелями', 'Dumbbell Lunge', 'quads', 'lunge', 'compound', ['dumbbell'], 1, 1.2,
    { glutes: 0.5, hamstrings: 0.2 }, ['knee'],
    'Шаг вперёд, оба колена сгибаются примерно до 90°. Отталкивайтесь передней ногой.', { unilateral: true }),
  ex('leg-extension', 'Разгибание ног в тренажёре', 'Leg Extension', 'quads', 'leg_extension', 'isolation', ['machine'], 1, 1,
    { }, ['knee'],
    'Валик на нижней части голени. Разгибайте плавно, на секунду задержитесь вверху.'),

  // ───── Бицепс бедра ─────
  ex('romanian-deadlift', 'Румынская тяга со штангой', 'Romanian Deadlift', 'hamstrings', 'hinge', 'compound', ['barbell'], 2, 1,
    { glutes: 0.5, upperBack: 0.3, forearms: 0.2 }, ['lowBack'],
    'Колени слегка согнуты, штанга скользит вдоль ног. Отводите таз назад, спина ровная; опускайтесь до растяжения бицепса бедра.'),
  ex('db-rdl', 'Румынская тяга с гантелями', 'Dumbbell Romanian Deadlift', 'hamstrings', 'hinge', 'compound', ['dumbbell'], 1, 1.5,
    { glutes: 0.5, forearms: 0.2 }, ['lowBack'],
    'Гантели вдоль ног. Отводите таз назад, спина нейтральна, опускайтесь до ощущения растяжения.'),
  ex('deadlift', 'Становая тяга', 'Conventional Deadlift', 'hamstrings', 'hinge', 'compound', ['barbell'], 3, 2,
    { glutes: 0.6, upperBack: 0.5, lats: 0.3, forearms: 0.3, core: 0.3, quads: 0.3 }, ['lowBack'],
    'Штанга над серединой стопы, спина нейтральна. Отталкивайтесь ногами от пола, штанга идёт вплотную к телу.',
    { mainLift: true, fatigue: 3 }),
  ex('back-extension', 'Гиперэкстензия', 'Back Extension', 'hamstrings', 'hinge', 'compound', ['bench'], 1, 3,
    { glutes: 0.5 }, ['lowBack'],
    'Сгибайтесь в тазобедренных суставах, спина ровная. В верхней точке не переразгибайте поясницу.'),
  ex('seated-leg-curl', 'Сгибание ног сидя', 'Seated Leg Curl', 'hamstrings', 'leg_curl', 'isolation', ['machine'], 1, 1,
    { calves: 0.2 }, ['knee'],
    'Валик над пятками. Сгибайте колени плавно, возвращайте медленно.'),
  ex('lying-leg-curl', 'Сгибание ног лёжа', 'Lying Leg Curl', 'hamstrings', 'leg_curl', 'isolation', ['machine'], 1, 1.3,
    { calves: 0.2 }, ['knee'],
    'Таз прижат к скамье. Сгибайте ноги без рывка, не отрывая бёдра.'),

  // ───── Ягодичные ─────
  ex('hip-thrust', 'Ягодичный мостик со штангой', 'Barbell Hip Thrust', 'glutes', 'hip_thrust', 'compound', ['barbell', 'bench'], 2, 1,
    { hamstrings: 0.3 }, [],
    'Лопатки на скамье, штанга на тазу. Поднимайте таз до прямой линии плечи–колени, сжимая ягодицы.'),
  ex('db-hip-thrust', 'Ягодичный мостик с гантелью', 'Dumbbell Hip Thrust', 'glutes', 'hip_thrust', 'compound', ['dumbbell', 'bench'], 1, 1.5,
    { hamstrings: 0.3 }, [],
    'Лопатки на скамье, гантель на тазу. Поднимайте таз, в верхней точке сильно сожмите ягодицы.'),
  ex('glute-bridge', 'Ягодичный мостик', 'Glute Bridge', 'glutes', 'hip_thrust', 'compound', ['bodyweight'], 1, 2.5,
    { hamstrings: 0.3 }, [],
    'Лёжа на полу, стопы близко к тазу. Поднимайте таз, сжимая ягодицы, без прогиба в пояснице.', { repStyle: 'high' }),
  ex('cable-kickback', 'Отведение ноги назад в блоке', 'Cable Glute Kickback', 'glutes', 'glute_iso', 'isolation', ['cable'], 1, 1,
    { hamstrings: 0.2 }, [],
    'Опора руками, отводите ногу назад до выпрямления бедра, без прогиба поясницы.', { unilateral: true }),
  ex('hip-abduction', 'Разведение ног в тренажёре', 'Hip Abduction Machine', 'glutes', 'glute_iso', 'isolation', ['machine'], 1, 1.5,
    { }, [],
    'Разводите колени плавно, без рывков, возвращайтесь под контролем.', { repStyle: 'high' }),

  // ───── Икры ─────
  ex('standing-calf-raise', 'Подъём на носки стоя в тренажёре', 'Standing Calf Raise', 'calves', 'calf_raise', 'isolation', ['machine'], 1, 1,
    { }, [],
    'Полная амплитуда: глубокое растяжение внизу, пауза вверху.', { repStyle: 'high' }),
  ex('seated-calf-raise', 'Подъём на носки сидя', 'Seated Calf Raise', 'calves', 'calf_raise', 'isolation', ['machine'], 1, 1.5,
    { }, [],
    'Колени под валиком. Плавно поднимайтесь на носки и полностью растягивайте икры внизу.', { repStyle: 'high' }),
  ex('db-calf-raise', 'Подъём на носки с гантелью', 'Dumbbell Calf Raise', 'calves', 'calf_raise', 'isolation', ['dumbbell'], 1, 2.5,
    { }, [],
    'Носок на ступеньке, гантель в руке, вторая рука на опоре. Опускайте пятку ниже уровня платформы.', { repStyle: 'high', unilateral: true }),

  // ───── Кор и пресс ─────
  ex('plank', 'Планка', 'Plank', 'core', 'core_stability', 'isolation', ['bodyweight'], 1, 1.2,
    { }, ['shoulder'],
    'Тело — прямая линия, пресс и ягодицы напряжены, без прогиба в пояснице. Дышите ровно.', { timed: true }),
  ex('side-plank', 'Боковая планка', 'Side Plank', 'core', 'core_stability', 'isolation', ['bodyweight'], 1, 1.5,
    { }, ['shoulder'],
    'Опора на предплечье, таз приподнят, тело — прямая линия. Выполняйте на обе стороны.', { timed: true, unilateral: true }),
  ex('cable-crunch', 'Скручивания на блоке', 'Cable Crunch', 'core', 'core_flexion', 'isolation', ['cable'], 1, 1,
    { }, [],
    'Стоя на коленях, канат у головы. Округляйте корпус, сближая рёбра и таз, без тяги руками.'),
  ex('hanging-knee-raise', 'Подъём коленей в висе', 'Hanging Knee Raise', 'core', 'core_flexion', 'isolation', ['bodyweight'], 2, 1.5,
    { forearms: 0.2 }, ['shoulder'],
    'В висе подтягивайте колени к груди, подкручивая таз. Без раскачки.'),
  ex('crunch', 'Скручивания лёжа', 'Crunch', 'core', 'core_flexion', 'isolation', ['bodyweight'], 1, 2,
    { }, ['neck'],
    'Поясница прижата, отрывайте лопатки от пола, не тяните шею руками.', { repStyle: 'high' }),
  ex('pallof-press', 'Жим Паллофа (антиротация)', 'Pallof Press', 'core', 'core_stability', 'isolation', ['cable'], 1, 1.5,
    { }, [],
    'Стоя боком к блоку, выжимайте рукоять от груди вперёд, не позволяя корпусу вращаться.', { unilateral: true }),
];

export const EXERCISE_MAP: ReadonlyMap<string, Exercise> = new Map(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise {
  const found = EXERCISE_MAP.get(id);
  if (!found) throw new Error(`Упражнение не найдено: ${id}`);
  return found;
}

export const EQUIPMENT_LABELS_RU: Record<Equipment, string> = {
  barbell: 'Штанга',
  dumbbell: 'Гантели',
  machine: 'Тренажёры',
  cable: 'Блоки и кроссоверы',
  bodyweight: 'Собственный вес',
  bench: 'Скамья и вспомогательное оборудование',
};

export const JOINT_LABELS_RU: Record<JointTag, string> = {
  shoulder: 'Плечи', elbow: 'Локти', wrist: 'Запястья', lowBack: 'Поясница', knee: 'Колени', hip: 'Тазобедренные', neck: 'Шея',
};

export const PATTERN_LABELS_RU: Record<MovementPattern, string> = {
  horizontal_push: 'Жим горизонтальный', incline_push: 'Жим под углом', dip: 'Отжимания на брусьях', chest_fly: 'Сведение/разведение',
  vertical_pull: 'Вертикальная тяга', horizontal_pull: 'Горизонтальная тяга', lat_isolation: 'Пуловер', shrug: 'Шраги',
  vertical_push: 'Жим над головой', front_raise: 'Подъём перед собой', lateral_raise: 'Махи в стороны', rear_delt_fly: 'Разведения на задние дельты',
  elbow_flexion: 'Сгибание рук', elbow_extension: 'Разгибание рук', close_grip_press: 'Жим узким хватом',
  wrist: 'Сгибание кистей', carry: 'Переноска / удержание',
  squat: 'Присед / жим ногами', lunge: 'Выпады', leg_extension: 'Разгибание ног',
  hinge: 'Наклон / тяга (шарнир в бедре)', leg_curl: 'Сгибание ног', hip_thrust: 'Ягодичный мостик', glute_iso: 'Отведение / разгибание бедра',
  calf_raise: 'Подъём на носки', core_flexion: 'Сгибание корпуса', core_stability: 'Стабилизация корпуса',
};

export interface ExerciseConstraints {
  equipment: readonly Equipment[];
  excludedIds: readonly string[];
  limitations: readonly JointTag[];
  maxDifficulty: Difficulty;
}

/** Упражнение доступно: есть оборудование, не исключено, не задевает проблемные суставы, не сложнее допустимого. */
export function isExerciseAllowed(e: Exercise, c: ExerciseConstraints): boolean {
  if (e.difficulty > c.maxDifficulty) return false;
  if (c.excludedIds.includes(e.id)) return false;
  if (e.joints.some((j) => c.limitations.includes(j))) return false;
  return e.equipment.every((eq) => eq === 'bodyweight' || c.equipment.includes(eq));
}

export function getAvailableExercises(c: ExerciseConstraints): Exercise[] {
  return EXERCISES.filter((e) => isExerciseAllowed(e, c));
}
