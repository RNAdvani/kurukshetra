import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight } from 'lucide-react';
import { DebateConfig } from '../types';

interface SetupWizardProps {
  onComplete: (config: DebateConfig) => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [debateType, setDebateType] = useState<DebateConfig['debate_type']>('policy');
  const [difficulty, setDifficulty] = useState<DebateConfig['difficulty']>('beginner');
  const [statement, setStatement] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({ debate_type: debateType, difficulty, statement });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <Card className="w-full max-w-xl">
        <CardContent className="p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Set Up Your Debate</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Debate Type</label>
              <Select value={debateType} onValueChange={(value: DebateConfig['debate_type']) => setDebateType(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select debate type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="policy">Policy</SelectItem>
                  <SelectItem value="value">Value</SelectItem>
                  <SelectItem value="fact">Fact</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Difficulty</label>
              <Select value={difficulty} onValueChange={(value: DebateConfig['difficulty']) => setDifficulty(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Debate Statement</label>
              <Input
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                placeholder="Enter your debate statement"
                className="w-full"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              disabled={!debateType || !difficulty || !statement}
            >
              Start Debate
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};