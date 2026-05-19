import { useEffect, useState } from 'react'
import { FiSettings } from 'react-icons/fi'
import { apiClient } from '../../../shared/api/client'
import { Button, Card, Input } from '../../../shared/ui'

export function PricingPage() {
  const [baseRate, setBaseRate] = useState<number>(50)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const refresh = async () => {
    try {
      const response = await apiClient.get('/pricing')
      setBaseRate(response.data.base_rwf_per_km)
    } catch (err) {
      console.error('Failed to fetch pricing config', err)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const handleUpdate = async () => {
    setError(null)
    setSuccess(false)
    try {
      setIsUpdating(true)
      await apiClient.put('/pricing', { base_rwf_per_km: baseRate })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('Failed to update fare settings')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-4xl font-semibold text-zinc-900">Fare Settings</h2>
        <p className="text-lg text-zinc-600">Configure the global transit pricing rate.</p>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="border-b border-zinc-100 bg-zinc-50/50 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
              <FiSettings size={20} />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900">Base Rate Configuration</h3>
              <p className="text-sm text-zinc-500">Set the standard price per kilometer</p>
            </div>
          </div>
        </div>
        
        <div className="p-8 space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold uppercase tracking-widest text-zinc-500">
                Standard Rate (RWF/km)
              </label>
              <div className="flex items-center gap-2">
                <span className="font-mono text-3xl font-bold text-emerald-600">{baseRate}</span>
                <span className="text-zinc-400 font-medium">RWF</span>
              </div>
            </div>
            
            <input
              type="range"
              min="1"
              max="500"
              step="1"
              value={baseRate}
              onChange={(e) => setBaseRate(Number(e.target.value))}
              disabled={isUpdating}
              className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            
            <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              <span>1 RWF</span>
              <span>250 RWF</span>
              <span>500 RWF</span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Input 
                type="number"
                value={baseRate}
                onChange={(e) => setBaseRate(Number(e.target.value))}
                className="w-32 h-12 text-center text-xl font-bold font-mono"
              />
              <p className="text-sm text-zinc-500 italic">
                You can also enter the exact value manually.
              </p>
            </div>

            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            {success && <p className="text-sm font-medium text-emerald-600">Fare settings updated successfully!</p>}

            <div className="pt-4 border-t border-zinc-100 flex justify-end">
              <Button 
                onClick={handleUpdate}
                disabled={isUpdating}
                className="bg-emerald-600 hover:bg-emerald-700 h-12 px-8 text-base shadow-lg shadow-emerald-100 text-white"
              >
                {isUpdating ? 'Saving...' : success ? 'Updated' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-emerald-50 border-emerald-100 p-6">
        <h4 className="font-bold text-emerald-900 text-sm italic">Note to Admin</h4>
        <p className="text-xs text-emerald-700 mt-2 leading-relaxed">
          Updating the base rate affects all ticket prices across the entire network immediately. 
          Ensure the new value matches regulatory requirements before saving.
        </p>
      </Card>
    </div>
  )
}
