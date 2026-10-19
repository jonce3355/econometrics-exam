// Conceptual practice for skills that cannot be varied numerically:
// each drill combines one true statement with three false ones from the
// same concept, all drawn from the ideas in the teacher's question bank.
import { build, type Gen } from './core';

interface Pool {
  stem: string;
  truths: string[];
  falses: [string, string][]; // [statement, why it is false]
}

const POOLS: Record<string, Pool> = {
  'mat-mult-rules': {
    stem: 'Which statement about matrix multiplication is correct?',
    truths: ['Matrix multiplication is generally not commutative: $AB\\neq BA$ in general.', '$AB$ is defined when the number of columns of $A$ equals the number of rows of $B$.', 'If $A$ is $r\\times s$ and $B$ is $s\\times t$, then $AB$ is $r\\times t$.'],
    falses: [['$AB=BA$ for all matrices.', 'Order matters in matrix multiplication.'], ['$AB$ is defined whenever $A$ and $B$ have the same dimensions.', 'Two 2×3 matrices cannot be multiplied.'], ['The result of $AB$ always has the same dimension as $A$.', 'It has the rows of A and the columns of B.'], ['Matrices are multiplied element by element.', 'That is the Hadamard product, not matrix multiplication.']],
  },
  'mat-transpose-rules': {
    stem: 'Which transpose rule is correct?',
    truths: ["$(AB)'=B'A'$", "$(A')'=A$", "$(A+B)'=A'+B'$"],
    falses: [["$(AB)'=A'B'$", 'The order must be reversed.'], ["$(AB)'=AB$", 'Transposing generally changes the matrix.'], ["$(A')'=A'$", 'Transposing twice returns A.'], ["$(A+B)'=B'-A'$", 'Transposes add, they do not subtract.']],
  },
  'mat-inverse': {
    stem: 'Which statement about a square matrix $A$ is correct?',
    truths: ['If $A$ has full rank, then $A^{-1}$ exists.', '$AA^{-1}=A^{-1}A=I$.', 'For invertible $A$ and $B$, $(AB)^{-1}=B^{-1}A^{-1}$.'],
    falses: [['If its columns are linearly dependent, then $A^{-1}$ must exist.', 'Dependent columns ⇒ singular ⇒ no inverse.'], ['If $A^{-1}$ exists, then $AA^{-1}=A$.', 'The product is the identity I.'], ['For invertible $A$ and $B$, $(AB)^{-1}=A^{-1}B^{-1}$.', 'The order reverses.'], ['Every square matrix has an inverse.', 'Only full-rank ones do.']],
  },
  'error-causality': {
    stem: 'Which statement is correct?',
    truths: ['The error term $u$ contains all factors affecting $Y$ that are not included in the model.', '*Ceteris paribus* means all other relevant factors are held constant.', '$\\mathbb E[Y\\mid X]$ need not be causal because other factors may affect both $X$ and $Y$, or there may be reverse causality.', 'The gap $Y-\\mathbb E[Y\\mid X]$ is interpreted as the error term.'],
    falses: [['The error term is the expected value of $Y$ given the regressors.', 'That is E[Y|X], the systematic part.'], ['*Ceteris paribus* means all variables must increase together.', 'It means "other things equal".'], ['$\\mathbb E[Y\\mid X]$ always measures the causal effect of $X$ on $Y$.', 'Confounding/reverse causality break that.'], ['The error term only contains measurement error in $X$.', 'It contains all omitted influences on Y.'], ['Causality requires $\\mathbb E[Y]=0$.', 'Not a requirement.']],
  },
  'random-sampling': {
    stem: 'Which statement best describes random sampling?',
    truths: ['Each member of the population is equally likely to be selected.'],
    falses: [['Only observations with the largest values of $Y$ are selected.', 'Selecting on the outcome.'], ['Observations are selected from only one subgroup of the population.', 'Not representative.'], ['Observations are selected after seeing the regression results.', 'Data snooping.'], ['Observations are chosen because they are convenient to reach.', 'Convenience sampling is not random.']],
  },
  'ols-model': {
    stem: 'In $y=X\\beta+\\varepsilon$ estimated by OLS, which statement is correct?',
    truths: ['$\\beta$ is the vector of population coefficients.', '$\\varepsilon_i$ is a population error, while $e_i$ is a sample residual calculated after estimation.', "The residual vector is $e=y-X\\hat\\beta$.", 'Fitted values are $\\hat y=X\\hat\\beta$.'],
    falses: [['$\\beta$ is the vector of sample residuals.', 'Residuals are e.'], ['$e=y-X\\beta$ is the OLS residual vector.', 'That uses the unknown β: it is ε.'], ['$\\varepsilon$ and $e$ are always numerically identical.', 'Only if β̂ = β exactly.'], ["$e=X'y$.", 'Not a residual.'], ['Both $\\varepsilon$ and $e$ are observed before estimation.', 'ε is never observed.']],
  },
  'ols-calculus': {
    stem: 'In the OLS derivation, which statement is correct?',
    truths: ["$\\partial(y'y)/\\partial\\beta=0$", "$\\partial(-2\\beta'X'y)/\\partial\\beta=-2X'y$", "$\\partial(\\beta'X'X\\beta)/\\partial\\beta=2X'X\\beta$", "The first-order condition is $-2X'y+2X'X\\hat\\beta=0$.", "$(y-X\\hat\\beta)'(y-X\\hat\\beta)=y'y-2\\hat\\beta'X'y+\\hat\\beta'X'X\\hat\\beta$"],
    falses: [["$\\partial(y'y)/\\partial\\beta=2y$", 'y′y does not depend on β.'], ["$\\partial(\\beta'X'X\\beta)/\\partial\\beta=X'y$", 'The quadratic term gives 2X′Xβ.'], ["The first-order condition is $X'y=0$.", 'That is not the derivative.'], ["$(y-X\\hat\\beta)'(y-X\\hat\\beta)=y'y+2\\hat\\beta'X'y-\\hat\\beta'X'X\\hat\\beta$", 'Signs flipped.'], ["$\\partial(-2\\beta'X'y)/\\partial\\beta=-2y'X$", 'That is a row vector (transposed).']],
  },
  'ols-normal-eq': {
    stem: 'Which statement about the OLS estimator is correct?',
    truths: ["The normal equations are $X'X\\hat\\beta=X'y$.", "If $X'X$ is invertible, $\\hat\\beta=(X'X)^{-1}X'y$.", "Full column rank of $X$ makes $X'X$ invertible and the OLS solution unique.", "Substituting $y=X\\beta+\\varepsilon$ gives $\\hat\\beta=\\beta+(X'X)^{-1}X'\\varepsilon$.", 'If one regressor is the exact sum of two others, the full-rank assumption fails.'],
    falses: [["The normal equations are $XX'\\hat\\beta=y$.", 'Wrong order/dimensions.'], ["$\\hat\\beta=X'X(X'y)^{-1}$", 'A vector cannot be inverted.'], ['Full rank guarantees the errors are normally distributed.', 'Rank says nothing about distributions.'], ["$\\hat\\beta=\\beta+X\\varepsilon$", 'Wrong decomposition.'], ['Perfect multicollinearity violates the zero conditional mean assumption.', 'It violates full rank.']],
  },
  'ols-assumptions': {
    stem: 'Which statement about the unbiasedness of OLS is correct?',
    truths: ['OLS is unbiased if $\\mathbb E(\\varepsilon\\mid X)=0$ (together with full rank).', 'Homoskedasticity is not needed for OLS to be unbiased.', 'Normality of the errors is not needed for OLS to be unbiased.'],
    falses: [['OLS is unbiased only if the errors are normally distributed.', 'Normality is for exact inference.'], ['OLS is unbiased only if the errors are homoskedastic.', 'Homoskedasticity matters for SEs.'], ["OLS is unbiased because $X'e=0$.", 'That is a mechanical property of residuals, not an assumption.'], ['OLS is unbiased if the explanatory variables are normally distributed.', 'Never required.'], ['OLS is unbiased when the regressors are perfectly correlated with the error term.', 'That causes bias.']],
  },
  'ols-residual-props': {
    stem: 'When a constant is included in an OLS regression, which statement about the residuals is correct?',
    truths: ['Their sample sum equals zero.', "They are orthogonal to every regressor: $X'e=0$.", 'Their sample mean equals zero.'],
    falses: [['Their sample mean must equal one.', 'Mean is zero.'], ['They must all be positive.', 'They are positive and negative.'], ['They must equal the population errors.', 'Residuals ≠ errors.'], ['Their sum of squares is zero.', 'Only with a perfect fit.']],
  },
  'ols-variance': {
    stem: 'Which statement about the variance of the OLS estimator is correct?',
    truths: ["$\\text{Var}(Az\\mid X)=A\\,\\text{Var}(z\\mid X)A'$ when $A$ is fixed given $X$.", "In general $\\text{Var}(\\hat\\beta\\mid X)=(X'X)^{-1}X'\\Omega X(X'X)^{-1}$.", "Under $\\Omega=\\sigma^2I$, $\\text{Var}(\\hat\\beta\\mid X)=\\sigma^2(X'X)^{-1}$.", "The diagonal of $\\text{Var}(\\hat\\beta\\mid X)$ contains the variances of the individual coefficient estimators.", "$\\hat\\beta-\\beta=(X'X)^{-1}X'\\varepsilon$."],
    falses: [["$\\text{Var}(Az\\mid X)=A\\,\\text{Var}(z\\mid X)$", "Missing A′ on the right."], ["Under $\\Omega=\\sigma^2I$, $\\text{Var}(\\hat\\beta\\mid X)=\\sigma^2X'X$.", 'The inverse is missing.'], ["The diagonal of $\\text{Var}(\\hat\\beta\\mid X)$ contains the estimated coefficients.", 'It contains variances.'], ["If $X$ is $100\\times4$, $\\text{Var}(\\hat\\beta\\mid X)$ is $100\\times100$.", 'It is 4×4.'], ["$\\hat\\beta-\\beta=X'X\\varepsilon$", 'Inverse missing.']],
  },
  'hyp-meaning': {
    stem: 'In $Y_i=\\beta_0+\\beta_1X_{1i}+\\beta_2X_{2i}+u_i$, which statement is correct?',
    truths: ['$H_0:\\beta_2=0$ states that $X_2$ has no effect on the expected value of $Y$ (holding $X_1$ constant).', '$H_a:\\beta_2\\neq0$ states that $X_2$ has an effect on the expected value of $Y$.', 'A two-sided significance test uses $H_0:\\beta_j=0$ against $H_1:\\beta_j\\neq0$.', 'A single-coefficient test is a partial test because the other regressors are held constant.'],
    falses: [['$H_0:\\beta_2=0$ states that $\\beta_2$ has no effect on $Y$.', 'Parameters do not affect Y; X₂ does.'], ['$H_0:\\beta_2=0$ states that $Y$ has no effect on $X_2$.', 'Wrong direction.'], ['A significance test uses $H_0:\\hat\\beta_j=0$.', 'Hypotheses concern population parameters, not estimates.'], ['A partial test uses only part of the sample.', '"Partial" refers to holding other regressors constant.'], ['A significance test uses $H_0:\\beta_j\\neq0$ against $H_1:\\beta_j=0$.', 'Reversed.']],
  },
  'se-properties': {
    stem: 'Which statement about the standard error of an OLS slope coefficient is correct?',
    truths: ['It measures the precision (sampling uncertainty) of the coefficient estimate.', 'It falls when there is more variation in the explanatory variable, other things equal.', 'It falls as the number of observations increases, other things equal.', 'Under heteroskedasticity, the usual homoskedastic standard errors are no longer valid (OLS remains unbiased).'],
    falses: [['It can be negative when the estimated coefficient is negative.', 'SEs are never negative.'], ['It becomes smaller as the variance of the error term becomes larger.', 'Larger σ² → larger SE.'], ['It does not depend on the sample size.', 'Larger n → smaller SE.'], ['Heteroskedasticity makes the OLS estimator biased.', 'Only the SEs are affected.'], ['Adding irrelevant explanatory variables always reduces it.', 'Usually raises it.']],
  },
  fwl: {
    stem: 'In $y=\\beta_0+\\beta_1x+\\beta_2z+u$, which statement about the Frisch–Waugh–Lovell theorem is correct?',
    truths: ['$\\hat\\beta_1$ equals the slope from regressing residualized $y$ on residualized $x$ (both residualized on $z$).', 'The residual from regressing $x$ on $z$ is the part of $x$ not linearly explained by $z$.', 'FWL steps: residualize $x$ on $z$, residualize $y$ on $z$, regress the residualized $y$ on the residualized $x$.'],
    falses: [['$\\hat\\beta_1$ equals the coefficient from regressing $y$ on $z$ only.', 'That ignores x.'], ['The residual from regressing $x$ on $z$ is the part of $x$ perfectly explained by $z$.', 'That is the fitted value.'], ['FWL: residualize $z$ on $x$, then regress $x$ on $y$.', 'Roles reversed.'], ['$\\hat\\beta_1$ equals the correlation between $x$ and $z$.', 'Not a coefficient of y.']],
  },
  'partial-effect': {
    stem: 'Which statement about coefficients in multiple regression is correct?',
    truths: ['$\\beta_1$ is the partial association between $x$ and $y$, holding the other regressors constant.', 'Adding a control can change a coefficient because the control removes variation in $x$ that is shared with the control.', 'If a coefficient falls after adding a control, part of the simple association was shared with that control.'],
    falses: [['$\\beta_1$ is the unconditional association between $x$ and $y$.', 'That is the simple regression slope.'], ['OLS always forces coefficients toward zero when another regressor is added.', 'Coefficients can rise or fall.'], ['A coefficient that changes after adding a control proves the model is incorrectly estimated.', 'Changes are expected with correlated regressors.'], ['Adding a control proves that the remaining coefficient is causal.', 'Controls do not prove causality.']],
  },
  controls: {
    stem: 'Which statement about choosing control variables is correct?',
    truths: ['Controls should be chosen according to their role in the causal structure.', 'An inappropriate control can remove a causal channel or create bias.'],
    falses: [['Every available variable should be included as a control.', 'Bad controls create bias.'], ['Adding a control always improves causal interpretation.', 'Not for mediators or colliders.'], ['A control is useful only when it has a large coefficient.', 'Role, not size, matters.'], ['A smaller residual sum of squares after adding a control proves causality.', 'Fit ≠ causality.']],
  },
  'st-fwl': {
    stem: 'After `reg y x z`, the residuals `r_y` (from `reg y z`) and `r_x` (from `reg x z`) are computed and `reg r_y r_x, noconstant` is run. Which statement is correct?',
    truths: ['The coefficient on `r_x` equals the coefficient on `x` in `reg y x z`.'],
    falses: [['The coefficient on `r_x` equals the coefficient on `z` in `reg y x z`.', 'z was partialled out.'], ['The coefficient on `r_x` equals the intercept of `reg y x z`.', 'No.'], ['The coefficient on `r_x` equals the $R^2$ of the full regression.', 'No.'], ['The coefficient on `r_x` equals the coefficient on `x` in `reg y x` (without z).', 'That is the simple regression, which does not control for z.']],
  },
  'st-rdd': {
    stem: 'An RDD is estimated with `gen age0 = agecell - 21`, `gen over21 = agecell >= 21`, `reg all age0 over21`. Which statement is correct?',
    truths: ['The coefficient on `over21` is the discontinuity (jump) in the fitted outcome at age 21.', 'The intercept is the fitted outcome just below the cutoff (age0 = 0, over21 = 0).'],
    falses: [['The coefficient on `over21` is the slope below age 21.', 'That is age0.'], ['The coefficient on `over21` is the change in slope after age 21.', 'This model has no slope interaction.'], ['The coefficient on `age0` is the jump at the cutoff.', 'age0 is the slope.'], ['The coefficient on `over21` is the average age in the sample.', 'No.']],
  },
};

export const conceptualGens: Record<string, Gen> = Object.fromEntries(
  Object.entries(POOLS).map(([skill, pool]) => [
    skill,
    ((rng) => {
      const truth = rng.pick(pool.truths);
      const fs = rng.sample(pool.falses, 3);
      return build(rng, {
        skill,
        stem: pool.stem,
        correct: truth,
        distractors: fs.map((x) => x[0]),
        steps: ['Check each statement against the definition/rule.', ...fs.map(([s, why]) => `✗ ${s} — ${why}`)],
        explanation: `✓ ${truth}`,
      });
    }) as Gen,
  ]),
);

export const CONCEPTUAL_SKILLS = Object.keys(POOLS);
