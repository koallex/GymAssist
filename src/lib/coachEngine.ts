/** Локальный Coach: детерминированные подсказки по профилю, плану и дневнику. */
import type { UserProfile, WorkoutPlan, WorkoutSession } from './types';
import { buildExerciseProgress } from './progressStats';
import { getExercise } from './exerciseDatabase';

export interface CoachInsight { id: string; title: string; body: string; tone: 'positive' | 'neutral' | 'warning' }

const startOfWeek = (date: Date) => {
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
};

export function buildCoachInsights(profile: UserProfile, plan: WorkoutPlan, history: WorkoutSession[], now = new Date()): CoachInsight[] {
  const done = history.filter((s) => s.completed).sort((a, b) => (b.finishedAt ?? b.startedAt).localeCompare(a.finishedAt ?? a.startedAt));
  const weekStart = startOfWeek(now).toISOString().slice(0, 10);
  const thisWeek = done.filter((s) => (s.finishedAt ?? s.startedAt).slice(0, 10) >= weekStart);
  const insights: CoachInsight[] = [];

  if (done.length === 0) {
    insights.push({ id: 'start', title: 'Начните с первой тренировки', body: `Ваша программа рассчитана на ${profile.daysPerWeek} тренировок в неделю. Начните с первого дня и фиксируйте веса и повторения — Coach сможет точнее оценивать прогресс.`, tone: 'positive' });
  } else {
    insights.push({ id: 'week', title: 'Ритм этой недели', body: `Вы завершили ${thisWeek.length} ${thisWeek.length === 1 ? 'тренировку' : thisWeek.length < 5 ? 'тренировки' : 'тренировок'} из ${profile.daysPerWeek} запланированных. ${thisWeek.length >= profile.daysPerWeek ? 'План недели выполнен — уделите внимание восстановлению.' : 'Старайтесь придерживаться выбранного расписания без необходимости наверстывать пропуски двойной нагрузкой.'}`, tone: thisWeek.length >= profile.daysPerWeek ? 'positive' : 'neutral' });
    const latest = done[0];
    if (latest.feedback?.discomfortJoints.length) {
      const labels = latest.feedback.discomfortJoints.join(', ');
      insights.push({ id: 'pain', title: 'Обратите внимание на дискомфорт', body: `После последней тренировки отмечен дискомфорт: ${labels}. Не выполняйте болезненные движения. Проверьте ограничения в профиле и при повторении боли обратитесь к специалисту.`, tone: 'warning' });
    } else if (latest.feedback?.difficulty === 'too_hard' || latest.feedback?.completion === 'partial') {
      insights.push({ id: 'recovery', title: 'Дайте себе восстановиться', body: 'Последняя тренировка далась тяжело или была выполнена не полностью. Не пытайтесь компенсировать это дополнительным объёмом. Следующую тренировку выполняйте с запасом и ориентируйтесь на самочувствие.', tone: 'warning' });
    } else if (latest.feedback?.difficulty === 'easy') {
      insights.push({ id: 'easy', title: 'Можно постепенно усложнять', body: 'Последняя тренировка ощущалась лёгкой. Следуйте двойной прогрессии: сначала добавляйте повторения в заданном диапазоне, а вес увеличивайте после уверенного выполнения всех подходов.', tone: 'positive' });
    }
  }

  const progress = buildExerciseProgress(done);
  const plateau = progress.find((p) => p.points.length >= 3 && p.trend === 'flat');
  if (plateau) {
    const ex = getExercise(plateau.exerciseId);
    insights.push({ id: 'plateau', title: 'Проверьте прогресс в упражнении', body: `В упражнении «${ex.nameRu}» последние записи показывают одинаковый рабочий вес. Это не обязательно застой: попробуйте постепенно добавить повторение, проверьте технику и отдых между подходами. Не повышайте вес ценой нарушения техники.`, tone: 'neutral' });
  }

  const next = plan.days.find((d) => !done.some((s) => s.planDayIndex === d.index && (s.finishedAt ?? s.startedAt).slice(0, 10) >= weekStart));
  if (next && insights.length < 4) {
    const dayNames = ['понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу', 'воскресенье'];
    insights.push({ id: 'next', title: 'Следующий шаг', body: `Ближайший незакрытый день программы — «${next.name}» (${dayNames[next.weekday]}). В нём ${next.exercises.length} упражнений, ориентировочно ${next.estimatedMinutes} минут.`, tone: 'positive' });
  }
  return insights.slice(0, 4);
}

export function answerCoachQuestion(question: string, profile: UserProfile, plan: WorkoutPlan, history: WorkoutSession[]): string {
  const q = question.toLowerCase();
  const done = history.filter((s) => s.completed);
  if (/вес|увелич|тяжел|нагруз/.test(q)) return 'Используйте двойную прогрессию: оставайтесь в диапазоне повторений из программы. Сначала добейтесь верхней границы во всех рабочих подходах с хорошей техникой и запасом примерно 1–3 повтора. Затем увеличьте вес небольшим шагом и вернитесь к нижней границе диапазона.';
  if (/отдых|восстанов|бол|устал/.test(q)) return 'Между тяжёлыми тренировками одной группы мышц обычно нужен достаточный интервал восстановления. Если сохраняется выраженная усталость, падают результаты или появляется боль, уменьшите нагрузку или перенесите тренировку. Не тренируйтесь через боль.';
  if (/пит|бел|калор|еда|похуд/.test(q)) return 'Питание зависит от цели и общего состояния. Для изменения массы важен устойчивый энергетический баланс, а для сохранения мышц — достаточное количество белка. Этот локальный Coach не рассчитывает медицинские нормы и рацион; при заболеваниях или особых ограничениях обсудите питание со специалистом.';
  if (/сколько|част|дней|распис/.test(q)) return `В вашем профиле выбрано ${profile.daysPerWeek} тренировок в неделю. В программе «${plan.splitName}». Важнее регулярность и восстановление, чем максимальное число тренировок.`;
  if (/прогресс|результат|истор/.test(q)) return `В дневнике ${done.length} завершённых тренировок. Записывайте рабочий вес, повторения и самочувствие после каждой сессии — тогда рекомендации по прогрессии будут точнее.`;
  if (/программ|упражнен|замен/.test(q)) return `В текущей программе ${plan.days.length} тренировочных дней. Упражнения можно посмотреть в разделе «Программа», а подходящие варианты — в карточке упражнения через функцию замены. Если движение вызывает боль, не подбирайте замену наугад.`;
  return 'Я пока работаю без внешней языковой модели и отвечаю по локальным правилам. Могу помочь с прогрессией веса, восстановлением, расписанием, историей и структурой программы. Сформулируйте вопрос чуть конкретнее.';
}
