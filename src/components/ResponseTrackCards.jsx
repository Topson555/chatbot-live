import { Icon } from './Icon';

export const ResponseTrackCards = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-start gap-3 hover:border-cyan-300 transition cursor-pointer">
      <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
        <Icon name="marketing" className="w-5 h-5" />
      </div>
      <div>
        <h4 className="font-semibold text-slate-900 text-sm">Marketing & PR</h4>
        <p className="text-xs text-slate-500 mt-1 leading-normal">Press releases, social assets, partner kits.</p>
      </div>
    </div>

    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-start gap-3 hover:border-cyan-300 transition cursor-pointer">
      <div className="p-2.5 bg-cyan-50 text-cyan-600 rounded-lg shrink-0">
        <Icon name="code" className="w-5 h-5" />
      </div>
      <div>
        <h4 className="font-semibold text-slate-900 text-sm">Engineering Ops</h4>
        <p className="text-xs text-slate-500 mt-1 leading-normal">Staging deployment, load testing, rollback plans.</p>
      </div>
    </div>

    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-start gap-3 hover:border-cyan-300 transition cursor-pointer sm:col-span-2 sm:w-1/2">
      <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg shrink-0">
        <Icon name="support" className="w-5 h-5" />
      </div>
      <div>
        <h4 className="font-semibold text-slate-900 text-sm">Support Readiness</h4>
        <p className="text-xs text-slate-500 mt-1 leading-normal">FAQ updates, training docs, escalation paths.</p>
      </div>
    </div>
  </div>
);