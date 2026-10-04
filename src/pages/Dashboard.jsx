import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Award, FolderKanban, Plus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ certs: 0, projects: 0 })

  useEffect(() => {
    async function loadStats() {
      if (!user) return
      const { count: certCount } = await supabase.from('certificate').select('*', { count: 'exact', head: true })
      const { count: projCount } = await supabase.from('project').select('*', { count: 'exact', head: true })
      setStats({ certs: certCount || 0, projects: projCount || 0 })
    }
    loadStats()
  }, [user])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">Overview of your Student Vault</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex items-center space-x-4">
          <div className="p-4 bg-blue-500/10 text-blue-400 rounded-lg">
            <Award size={32} />
          </div>
          <div>
            <p className="text-sm text-slate-400 font-medium">Total Certificates</p>
            <p className="text-3xl font-bold text-white">{stats.certs}</p>
          </div>
        </div>
        
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex items-center space-x-4">
          <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <FolderKanban size={32} />
          </div>
          <div>
            <p className="text-sm text-slate-400 font-medium">Total Projects</p>
            <p className="text-3xl font-bold text-white">{stats.projects}</p>
          </div>
        </div>
      </div>

      <div className="flex space-x-4 pt-4">
        <Link to="/certificates" className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/30">
          <Plus size={20} />
          <span>Add Certificate</span>
        </Link>
        <Link to="/projects" className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/30">
          <Plus size={20} />
          <span>Add Project</span>
        </Link>
      </div>
    </div>
  )
}
