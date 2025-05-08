import { useState } from 'react';
import { Teacher } from '@/components/Teacher';

function OnBoarding() {
  const [teacherText, setTeacherText] = useState("");

  return (
    <div className="h-[95vh] bg-gradient-to-b from-gray-50 to-gray-100 
      flex items-center justify-center p-6">
      <Teacher text={teacherText} setText={setTeacherText} />
    </div>
  );
}

export default OnBoarding;