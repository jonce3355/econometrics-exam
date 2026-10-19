"""Re-create the Stata output for every Stata-based question in the bank.

Usage:  pip install pandas statsmodels scipy wooldridge
        python scripts/stata_outputs.py

Reads the .DTA files in ./data (WAGE1.DTA falls back to the `wooldridge`
package copy, which is the same Wooldridge data set) and writes
src/data/stataOutputs.json. Questions whose data file is missing (FoS.DTA)
are written with "missing": true so the website can flag them.
"""
import json, os
import numpy as np
import pandas as pd
import statsmodels.formula.api as smf
from scipy import stats

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
OUT = os.path.join(ROOT, 'src', 'data', 'stataOutputs.json')


def load(name):
    for cand in (name, name.lower(), name.upper(), name.replace('.DTA', '.dta')):
        p = os.path.join(DATA, cand)
        if os.path.exists(p):
            df = pd.read_stata(p)
            # Stata stores small integers as int8; promote so that e.g. exper^2 cannot overflow.
            num = df.select_dtypes('number').columns
            df[num] = df[num].astype('float64')
            return df
    if name.upper() == 'WAGE1.DTA':
        import wooldridge
        return wooldridge.data('wage1')
    return None


def fnum(x):
    """Stata-like number formatting."""
    a = abs(x)
    if a != 0 and (a >= 1e6 or a < 1e-4):
        return f'{x:.3e}'
    if a >= 1000:
        return f'{x:.2f}'
    s = f'{x:.7g}'
    if s.startswith('0.'):
        s = s[1:]
    elif s.startswith('-0.'):
        s = '-' + s[2:]
    return s


def reg_text(m, depvar, names):
    n = int(m.nobs)
    k = int(m.df_model)
    lines = [
        f'      Source |       SS           df       MS      Number of obs   = {n:>9}',
        f'-------------+----------------------------------   F({k}, {int(m.df_resid)}){" " * max(0, 9 - len(str(k)) - len(str(int(m.df_resid))))}= {m.fvalue:>9.2f}' if k > 0 else
        f'-------------+----------------------------------   F(0, {int(m.df_resid)})        =      0.00',
        f'       Model | {fnum(m.ess):>11} {k:>9} {fnum(m.ess / max(k, 1)):>11}   Prob > F        = {m.f_pvalue if k > 0 else 1:>9.4f}',
        f'    Residual | {fnum(m.ssr):>11} {int(m.df_resid):>9} {fnum(m.ssr / m.df_resid):>11}   R-squared       = {m.rsquared:>9.4f}',
        f'-------------+----------------------------------   Adj R-squared   = {m.rsquared_adj:>9.4f}',
        f'       Total | {fnum(m.ess + m.ssr):>11} {n - 1:>9} {fnum((m.ess + m.ssr) / (n - 1)):>11}   Root MSE        = {np.sqrt(m.mse_resid):>9.4g}',
        '',
        '-' * 78,
        f'{depvar[:12]:>12} | Coefficient  Std. err.      t    P>|t|     [95% conf. interval]',
        '-------------+----------------------------------------------------------------',
    ]
    ci = m.conf_int()
    order = [p for p in m.params.index if p != 'Intercept'] + (['Intercept'] if 'Intercept' in m.params.index else [])
    for p in order:
        label = names.get(p, p) if p != 'Intercept' else '_cons'
        lines.append(f'{label:>12} | {fnum(m.params[p]):>10} {fnum(m.bse[p]):>10} {m.tvalues[p]:>8.2f}   {m.pvalues[p]:.3f}    {fnum(ci.loc[p, 0]):>10}  {fnum(ci.loc[p, 1]):>10}')
    lines.append('-' * 78)
    return lines


def test_text(m, hyp, labels):
    r = m.f_test(hyp)
    q = int(r.df_num)
    lines = [f' ( {i + 1})  {lab} = 0' for i, lab in enumerate(labels)]
    lines += ['', f'       F({q}, {int(r.df_denom)}) = {float(np.squeeze(r.fvalue)):>8.2f}', f'            Prob > F = {float(r.pvalue):>8.4f}']
    return lines


def stats_of(m, names):
    ci = m.conf_int()
    return {
        'n': int(m.nobs), 'r2': m.rsquared, 'adjr2': m.rsquared_adj,
        'F': m.fvalue if m.df_model > 0 else None,
        'coefs': {names.get(p, p if p != 'Intercept' else '_cons'): {
            'b': m.params[p], 'se': m.bse[p], 't': m.tvalues[p], 'p': m.pvalues[p],
            'lo': ci.loc[p, 0], 'hi': ci.loc[p, 1]} for p in m.params.index},
    }


def z(s):
    return (s - s.mean()) / s.std()


out = {}


def add(key, cmds, blocks, values=None, missing=False):
    out[key] = {'commands': cmds, 'output': '\n'.join(blocks), 'values': values or {}, 'missing': missing}


w = load('WAGE1.DTA')
w['lwage'] = np.log(w.wage)
w['expersq'] = w.exper ** 2
w['tenursq'] = w.tenure ** 2
w['fem_educ'] = w.female * w.educ
w['fem_exper'] = w.female * w.exper
w['fem_expersq'] = w.female * w.expersq

# S1 summarize by sex
def summ(df, cols):
    lines = ['    Variable |        Obs        Mean    Std. dev.       Min        Max', '-------------+---------------------------------------------------------']
    for c in cols:
        s = df[c]
        lines.append(f'{c:>12} | {len(s):>10} {fnum(s.mean()):>11} {fnum(s.std()):>11} {fnum(s.min()):>10} {fnum(s.max()):>10}')
    return lines
f1, f0 = w[w.female == 1], w[w.female == 0]
add('S1', 'sum wage educ if female==1\nsum wage educ if female==0',
    ['. sum wage educ if female==1', ''] + summ(f1, ['wage', 'educ']) + ['', '. sum wage educ if female==0', ''] + summ(f0, ['wage', 'educ']),
    {'wage_f': f1.wage.mean(), 'wage_m': f0.wage.mean(), 'educ_f': f1.educ.mean(), 'educ_m': f0.educ.mean()})

# S2 ttest
t = stats.ttest_ind(f0.wage, f1.wage)
def grp(name, s):
    se = s.std() / np.sqrt(len(s))
    return f'{name:>9} | {len(s):>7} {fnum(s.mean()):>10} {fnum(se):>10} {fnum(s.std()):>10} {fnum(s.mean() - 1.9647 * se):>10} {fnum(s.mean() + 1.9647 * se):>10}'
diff = f0.wage.mean() - f1.wage.mean()
sed = diff / t.statistic
add('S2', 'ttest wage, by(female)', [
    'Two-sample t test with equal variances',
    '------------------------------------------------------------------------------',
    '   Group |     Obs        Mean    Std. err.   Std. dev.   [95% conf. interval]',
    '---------+--------------------------------------------------------------------',
    grp('0', f0.wage), grp('1', f1.wage),
    '---------+--------------------------------------------------------------------',
    f'    diff |          {fnum(diff):>10} {fnum(sed):>10}',
    '------------------------------------------------------------------------------',
    f'    diff = mean(0) - mean(1)                                      t = {t.statistic:>8.4f}',
    f'H0: diff = 0                                     Degrees of freedom = {len(w) - 2:>8}',
    '',
    '    Ha: diff < 0                 Ha: diff != 0                 Ha: diff > 0',
    f' Pr(T < t) = 1.0000         Pr(|T| > |t|) = {t.pvalue:.4f}          Pr(T > t) = {t.pvalue / 2:.4f}'],
    {'t': t.statistic, 'diff': diff})

def regq(key, df, formula, depvar, cmds, names=None, tests=None):
    names = names or {}
    m = smf.ols(formula, df).fit()
    blocks = reg_text(m, depvar, names)
    vals = stats_of(m, names)
    for hyp, labels in tests or []:
        blocks += ['', '. test ' + ' '.join(labels), ''] + test_text(m, hyp, labels)
        r = m.f_test(hyp)
        vals['testF'] = float(np.squeeze(r.fvalue))
        vals['testP'] = float(r.pvalue)
    add(key, cmds, blocks, vals)
    return m

regq('S3', w, 'wage~educ+exper', 'wage', 'reg wage educ exper')
regq('S4', w, 'lwage~educ+exper+expersq+married+female', 'lwage',
     'gen lwage = ln(wage)\ngen expersq = exper^2\nreg lwage educ exper expersq married female')
out['S5'] = out['S4']
inter = 'lwage~educ+exper+expersq+married+female+fem_educ+fem_exper+fem_expersq'
regq('S6', w, inter, 'lwage', 'reg lwage educ exper expersq married female fem_educ fem_exper fem_expersq')
regq('S7', w, inter, 'lwage', 'reg lwage educ exper expersq married female fem_educ fem_exper fem_expersq\ntest fem_educ fem_exper fem_expersq',
     tests=[('fem_educ=0,fem_exper=0,fem_expersq=0', ['fem_educ', 'fem_exper', 'fem_expersq'])])
regq('S8', w, 'wage~educ+exper+numdep+tenure', 'wage', 'reg wage educ exper numdep tenure\ntest numdep tenure',
     tests=[('numdep=0,tenure=0', ['numdep', 'tenure'])])
# S9 FWL
m_full = smf.ols('wage~educ+exper', w).fit()
w['r_wage'] = smf.ols('wage~exper', w).fit().resid
w['r_educ'] = smf.ols('educ~exper', w).fit().resid
m_fwl = smf.ols('r_wage~r_educ-1', w).fit()
add('S9', 'reg wage educ exper\n...\nreg r_wage r_educ, noconstant',
    ['. reg wage educ exper', ''] + reg_text(m_full, 'wage', {}) + ['', '. reg r_wage r_educ, noconstant', ''] + reg_text(m_fwl, 'r_wage', {}),
    {'full': stats_of(m_full, {}), 'fwl': stats_of(m_fwl, {})})
w['zwage'], w['zeduc'], w['zexper'] = z(w.wage), z(w.educ), z(w.exper)
regq('S10', w, 'zwage~zeduc+zexper', 'zwage', 'egen zwage = std(wage)\negen zeduc = std(educ)\negen zexper = std(exper)\nreg zwage zeduc zexper')

k = load('KIELMC.DTA')
regq('S11', k, 'rprice~nearinc*y81', 'rprice', 'reg rprice i.nearinc##i.y81',
     {'nearinc': '1.nearinc', 'y81': '1.y81', 'nearinc:y81': '1.nearinc#1.y81'})
a = load('AEJfigs.DTA')
a['age0'] = a.agecell - 21
a['over21'] = (a.agecell >= 21).astype(int)
regq('S12', a, 'all~age0+over21', 'all', 'gen age0 = agecell - 21\ngen over21 = agecell >= 21\nreg all age0 over21')
regq('S13', w, 'wage~educ', 'wage', 'reg wage educ')
m1 = smf.ols('wage~educ', w).fit(); m2 = smf.ols('wage~educ+exper', w).fit()
add('S14', 'reg wage educ\nreg wage educ exper', ['. reg wage educ', ''] + reg_text(m1, 'wage', {}) + ['', '. reg wage educ exper', ''] + reg_text(m2, 'wage', {}),
    {'m1': stats_of(m1, {}), 'm2': stats_of(m2, {})})
regq('S15', w, 'wage~educ+exper+tenure', 'wage', 'reg wage educ exper tenure')
regq('S16', w, 'wage~exper+expersq+educ+tenure+tenursq', 'wage', 'gen expersq = exper^2\ngen tenursq = tenure^2\nreg wage exper expersq educ tenure tenursq')
regq('S17', w, 'wage~exper+expersq+educ+tenure+tenursq', 'wage', 'reg wage exper expersq educ tenure tenursq\ntest exper expersq',
     tests=[('exper=0,expersq=0', ['exper', 'expersq'])])
fm = {'female': '1.female', 'married': '1.married', 'female:married': '1.female#1.married'}
regq('S18', w, 'wage~female*married', 'wage', 'reg wage i.female##i.married', fm)
out['S19'] = out['S18']

b = load('BWGHT.DTA')
regq('S20', b, 'bwght~cigs', 'bwght', 'reg bwght cigs')
out['S21'] = out['S20']
m1 = smf.ols('bwght~cigs', b).fit(); m2 = smf.ols('bwght~cigs+faminc', b).fit()
add('S22', 'reg bwght cigs\nreg bwght cigs faminc', ['. reg bwght cigs', ''] + reg_text(m1, 'bwght', {}) + ['', '. reg bwght cigs faminc', ''] + reg_text(m2, 'bwght', {}),
    {'m1': stats_of(m1, {}), 'm2': stats_of(m2, {})})
regq('S23', b, 'bwght~cigs+faminc', 'bwght', 'reg bwght cigs faminc')
regq('S24', b, 'lbwght~cigs+faminc', 'lbwght', 'reg lbwght cigs faminc')
regq('S25', b, 'bwght~cigs+faminc+male', 'bwght', 'reg bwght cigs faminc male')
regq('S26', b, 'bwght~cigs*male+faminc', 'bwght', 'reg bwght c.cigs##i.male faminc', {'male': '1.male', 'cigs:male': '1.male#c.cigs'})
b['zbwght'], b['zcigs'], b['zfaminc'] = z(b.bwght), z(b.cigs), z(b.faminc)
regq('S27', b, 'zbwght~zcigs+zfaminc', 'zbwght', 'egen zbwght = std(bwght)\negen zcigs = std(cigs)\negen zfaminc = std(faminc)\nreg zbwght zcigs zfaminc')

fos = load('FoS.DTA')
fos_cmds = {
    'S28': 'reg marks_FoS ent_math', 'S29': 'reg marks_FoS ent_ielts', 'S30': 'reg marks_FoS ent_math ent_ielts',
    'S31': 'reg marks_FoS ent_math ent_ielts\n...\nreg u_FoS u_math, noconstant', 'S32': 'reg marks_FoS marks_QM marks_AE\ntest marks_QM marks_AE'}
if fos is None:
    for key, c in fos_cmds.items():
        add(key, c, ['FoS.DTA has not been supplied yet - output not available.'], missing=True)
else:
    regq('S28', fos, 'marks_FoS~ent_math', 'marks_FoS', fos_cmds['S28'])
    regq('S29', fos, 'marks_FoS~ent_ielts', 'marks_FoS', fos_cmds['S29'])
    regq('S30', fos, 'marks_FoS~ent_math+ent_ielts', 'marks_FoS', fos_cmds['S30'])
    d = fos.dropna(subset=['marks_FoS', 'ent_math', 'ent_ielts']).copy()
    mf = smf.ols('marks_FoS~ent_math+ent_ielts', d).fit()
    d['u_FoS'] = smf.ols('marks_FoS~ent_ielts', d).fit().resid
    d['u_math'] = smf.ols('ent_math~ent_ielts', d).fit().resid
    mu = smf.ols('u_FoS~u_math-1', d).fit()
    add('S31', fos_cmds['S31'], ['. reg marks_FoS ent_math ent_ielts', ''] + reg_text(mf, 'marks_FoS', {}) + ['', '. reg u_FoS u_math, noconstant', ''] + reg_text(mu, 'u_FoS', {}),
        {'full': stats_of(mf, {}), 'fwl': stats_of(mu, {})})
    regq('S32', fos, 'marks_FoS~marks_QM+marks_AE', 'marks_FoS', fos_cmds['S32'], tests=[('marks_QM=0,marks_AE=0', ['marks_QM', 'marks_AE'])])


def clean(o):
    if isinstance(o, dict):
        return {k2: clean(v) for k2, v in o.items()}
    if isinstance(o, (np.floating, float)):
        return None if not np.isfinite(o) else round(float(o), 6)
    if isinstance(o, np.integer):
        return int(o)
    return o

with open(OUT, 'w') as fh:
    json.dump(clean(out), fh, indent=1)
print('wrote', OUT, len(out), 'entries')
