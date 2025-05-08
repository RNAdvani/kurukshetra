import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
   AlertTriangle,
   CheckCircle2,
   Mic,
   Square,
   SwitchCamera,
   Settings,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createNewDebate, declareDebateWinner } from "../services/blockchain";
import { AnalysisResult, TranscriptionSegment } from "@/types";
import { detectLanguage, translateText } from "@/services/translation";
import { Label } from "@/components/ui/label";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import axios from "axios";

const getProgressValue = (score: number) => {
   return Math.min(100, Math.max(0, (score / 10) * 100));
};

export default function DebateAnalyzer() {
   const [topic, setTopic] = useState("");
   const [currentSpeaker, setCurrentSpeaker] = useState<"person1" | "person2">(
      "person1"
   );
   const [translatedTranscription, setTranslatedTranscription] = useState<
      TranscriptionSegment[]
   >([]);
   const [firstPersonLanguage, setFirstPersonLanguage] = useState<"en" | "hi">(
      "en"
   );
   const [secondPersonLanguage, setSecondPersonLanguage] = useState<
      "en" | "hi"
   >("en");
   const [isCrossLingual, setIsCrossLingual] = useState(false);
   const targetLanguage = useRef<"en" | "hi">("en");
   const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
   const [isRecording, setIsRecording] = useState(false);
   const [transcription, setTranscription] = useState<TranscriptionSegment[]>(
      []
   );
   const [elapsedTime, setElapsedTime] = useState(0);
   const [debateId, setDebateId] = useState<number | null>(null);
   const [txHash, setTxHash] = useState<string | null>(null);
   const recognitionRef = useRef<any>(null);
   const timerRef = useRef<NodeJS.Timeout>();
   const currentSpeakerRef = useRef<"person1" | "person2">("person1");
   const [isSettingsOpen, setIsSettingsOpen] = useState(false);
   const [debateFormat, setDebateFormat] = useState<
      "public-forum" | "team-debate" | "policy-debate"
   >("public-forum");

   const getSpeakerLabel = (speaker: "person1" | "person2") => {
      switch (debateFormat) {
         case "team-debate":
            return speaker === "person1" ? "Team A" : "Team B";
         case "policy-debate":
            return speaker === "person1" ? "Affirmative" : "Negative";
         default:
            return speaker === "person1" ? "Participant 1" : "Participant 2";
      }
   };

   const WinnerBanner = ({
      winner,
      scores,
   }: {
      winner: string;
      scores: { person1: number; person2: number };
   }) => (
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6 rounded-lg text-white">
         <div className="flex items-center justify-between">
            <div className="space-y-2">
               <h2 className="text-2xl font-bold">Debate Result</h2>
               <p className="text-lg">
                  Winner: {getSpeakerLabel(winner as "person1" | "person2")}
               </p>
            </div>
            <div className="text-right">
               <p className="text-3xl font-bold">
                  {Math.max(scores.person1, scores.person2).toFixed(1)} -{" "}
                  {Math.min(scores.person1, scores.person2).toFixed(1)}
               </p>
               <p className="text-sm opacity-90">Final Score</p>
            </div>
         </div>
         <div className="mt-4 flex gap-4">
            <Progress
               value={
                  (scores.person1 / (scores.person1 + scores.person2)) * 100
               }
               className="h-3 bg-white/20"
            />
            <Progress
               value={
                  (scores.person2 / (scores.person1 + scores.person2)) * 100
               }
               className="h-3 bg-white/20"
            />
         </div>
      </div>
   );

   const SettingsSection = () => (
      <div className="space-y-4 max-w-4xl w-full mx-auto">
         <div className="space-y-2">
            <Label htmlFor="debateFormat">Debate Format</Label>
            <Select
               value={debateFormat}
               onValueChange={(
                  value: "public-forum" | "team-debate" | "policy-debate"
               ) => setDebateFormat(value)}
            >
               <SelectTrigger id="debateFormat" className="bg-white">
                  <SelectValue placeholder="Select debate format" />
               </SelectTrigger>
               <SelectContent>
                  <SelectItem value="public-forum">Public Forum</SelectItem>
                  <SelectItem value="team-debate">Team Debate</SelectItem>
                  <SelectItem value="policy-debate">Policy Debate</SelectItem>
               </SelectContent>
            </Select>
         </div>

         <div className="flex items-center space-x-2">
            <Checkbox
               id="isCrossLingual"
               checked={isCrossLingual}
               onCheckedChange={(checked) =>
                  setIsCrossLingual(checked as boolean)
               }
            />
            <Label htmlFor="isCrossLingual">Cross-lingual</Label>
         </div>

         <div className="space-y-2">
            <Label htmlFor="firstPersonLanguage">First Speaker Language</Label>
            <Select
               value={firstPersonLanguage}
               onValueChange={(value: "en" | "hi") =>
                  setFirstPersonLanguage(value)
               }
            >
               <SelectTrigger id="firstPersonLanguage" className="bg-white">
                  <SelectValue placeholder="Select language" />
               </SelectTrigger>
               <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
               </SelectContent>
            </Select>
         </div>

         <div className="space-y-2">
            <Label htmlFor="secondPersonLanguage">
               Second Speaker Language
            </Label>
            <Select
               value={secondPersonLanguage}
               onValueChange={(value: "en" | "hi") =>
                  setSecondPersonLanguage(value)
               }
            >
               <SelectTrigger id="secondPersonLanguage" className="bg-white">
                  <SelectValue placeholder="Select language" />
               </SelectTrigger>
               <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
               </SelectContent>
            </Select>
         </div>
      </div>
   );

   // Keep existing useEffect and other logic the same...

   useEffect(() => {
      const checkFirstLanguage = async () => {
         if (!isCrossLingual && transcription.length === 1) {
            const lang = await detectLanguage(transcription[0].text);
            if (lang === "hi-Latn") {
               targetLanguage.current = "hi";
               console.log("First person language set to Hindi");
               const intermediateText = await translateText(
                  transcription[0].text,
                  "en"
               );
               const transLatedText = await translateText(
                  intermediateText,
                  "hi"
               );
               const newTranscription: TranscriptionSegment = {
                  speaker: transcription[0].speaker,
                  text: transLatedText,
                  timestamp: transcription[0].timestamp,
               };
               setTranslatedTranscription([newTranscription]);
            }
         }
      };
      checkFirstLanguage();
   }, [transcription]);

   const initializeSpeechRecognition = (speaker: "person1" | "person2") => {
      if (typeof window !== "undefined") {
         const SpeechRecognition =
            (window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition;
         if (SpeechRecognition) {
            const recognizer = new SpeechRecognition();
            recognizer.continuous = true;
            recognizer.interimResults = false;
            recognizer.lang = "en-US";

            recognizer.onresult = async (event: any) => {
               const results = event.results;
               const last = results[results.length - 1];
               const transcript = last[0].transcript;

               let finalText = transcript;

               console.log(isCrossLingual, targetLanguage.current);
               if (!isCrossLingual && targetLanguage.current === "hi") {
                  const intermediateText = await translateText(
                     transcript,
                     "en"
                  );
                  finalText = await translateText(intermediateText, "hi");
                  setTranslatedTranscription((prev) => [
                     ...prev,
                     {
                        speaker: speaker,
                        text: finalText,
                        timestamp: Date.now(),
                     },
                  ]);
               }

               if (
                  isCrossLingual &&
                  firstPersonLanguage === "hi" &&
                  speaker === "person2"
               ) {
                  const intermediateText = await translateText(
                     transcript,
                     "en"
                  );
                  finalText = await translateText(intermediateText, "hi");
                  setTranslatedTranscription((prev) => [
                     ...prev,
                     {
                        speaker: speaker,
                        text: finalText,
                        timestamp: Date.now(),
                     },
                  ]);
               } else if (
                  isCrossLingual &&
                  secondPersonLanguage === "hi" &&
                  speaker === "person1"
               ) {
                  const intermediateText = await translateText(
                     transcript,
                     "en"
                  );
                  finalText = await translateText(intermediateText, "hi");
                  setTranslatedTranscription((prev) => [
                     ...prev,
                     {
                        speaker: speaker,
                        text: finalText,
                        timestamp: Date.now(),
                     },
                  ]);
               } else {
                  finalText = await translateText(transcript, "en");
                  setTranslatedTranscription((prev) => [
                     ...prev,
                     {
                        speaker: speaker,
                        text: finalText,
                        timestamp: Date.now(),
                     },
                  ]);
               }

               setTranscription((prev) => [
                  ...prev,
                  {
                     speaker: speaker,
                     text: transcript,
                     timestamp: Date.now(),
                  },
               ]);
            };

            recognitionRef.current = recognizer;
         }
      }
   };

   useEffect(() => {
      initializeSpeechRecognition(currentSpeakerRef.current);
   }, []);

   const startDebate = async () => {
      if (!topic) return;

      try {
         const newDebateId = await createNewDebate(topic);
         setDebateId(newDebateId);
         setTranscription([]);
         setElapsedTime(0);
         setIsRecording(true);
         initializeSpeechRecognition(currentSpeakerRef.current);
         recognitionRef.current?.start();

         timerRef.current = setInterval(() => {
            setElapsedTime((prev) => prev + 1);
         }, 1000);
      } catch (error) {
         console.error("Error starting debate:", error);
      }
   };

   const switchSpeaker = () => {
      if (recognitionRef.current) {
         recognitionRef.current.stop();
      }

      setCurrentSpeaker((prev) => {
         const newSpeaker = prev === "person1" ? "person2" : "person1";
         currentSpeakerRef.current = newSpeaker;
         return newSpeaker;
      });

      setTimeout(() => {
         initializeSpeechRecognition(currentSpeakerRef.current);
         if (isRecording) {
            recognitionRef.current?.start();
         }
      }, 100);
   };

   const stopDebate = () => {
      clearInterval(timerRef.current);
      setIsRecording(false);
      recognitionRef.current?.stop();
   };

   const analyzeDebate = async () => {
      try {
         const respTrans = await axios.post(
            "http://localhost:3000/translate-transcripts",
            {
               q: transcription.map((t) => t.text),
               target: "en",
            }
         );

         console.log("Translated transcripts:", respTrans.data);

         const englisTranslations: TranscriptionSegment[] = transcription.map(
            (t, index) => {
               return {
                  speaker: t.speaker,
                  text: respTrans.data.data.translations[index].translatedText,
                  timestamp: t.timestamp,
               };
            }
         );

         console.log("English Translations:", englisTranslations);


      const response = await fetch("http://localhost:5000/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic,
          transcription:englisTranslations,
        }),
      });

         const result = await response.json();
         console.log("Analysis result:", result);
         setAnalysis(result);
      } catch (err) {
         console.error("Analysis failed:", err);
      }
   };

   const declareWinnerOnChain = async () => {
      if (!debateId || !analysis) return;

      try {
         const hash = await declareDebateWinner(
            debateId,
            analysis.total.winner === "person1" ? 1 : 2
         );
         setTxHash(hash);
      } catch (error) {
         console.error("Blockchain declaration failed:", error);
      }
   };

   useEffect(() => {
      currentSpeakerRef.current = currentSpeaker;
   }, [currentSpeaker]);

   return (
      <div>
         <div className="flex justify-end mb-4">
            <Button
               variant="outline"
               onClick={() => setIsSettingsOpen(!isSettingsOpen)}
               disabled={isRecording}
            >
               <Settings className="mr-2 h-4 w-4" />
               Settings
            </Button>
         </div>

         {isSettingsOpen && (
            <Card className="mb-4 max-w-4xl mx-auto">
               <CardHeader>
                  <CardTitle>Debate Settings</CardTitle>
               </CardHeader>
               <CardContent>
                  <SettingsSection />
               </CardContent>
            </Card>
         )}

         <Card className="w-full max-w-4xl mx-auto my-8">
            <CardHeader>
               <CardTitle className="text-2xl font-bold text-center">
                  AI Debate Platform
               </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
               {!isRecording && !analysis && (
                  <div className="space-y-4">
                     <Input
                        placeholder="Enter debate topic"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                     />
                     <Button
                        className="w-full"
                        onClick={startDebate}
                        disabled={!topic}
                     >
                        <Mic className="mr-2 h-4 w-4" />
                        Start Debate
                     </Button>
                  </div>
               )}

               {isRecording && (
                  <div className="space-y-4">
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                           <span className="font-semibold">
                              Current Speaker:
                           </span>
                           <span className="capitalize">
                              {getSpeakerLabel(currentSpeaker)}
                           </span>
                        </div>
                        <Button variant="outline" onClick={switchSpeaker}>
                           <SwitchCamera className="mr-2 h-4 w-4" />
                           Switch Speaker
                        </Button>
                     </div>

                     <div className="space-y-2">
                        <Progress
                           value={(elapsedTime % 120) * 0.833}
                           className="h-2"
                        />
                        <p className="text-sm text-muted-foreground text-center">
                           Elapsed Time: {Math.floor(elapsedTime / 60)}m{" "}
                           {elapsedTime % 60}s
                        </p>
                     </div>

                     <Button
                        className="w-full"
                        variant="destructive"
                        onClick={stopDebate}
                     >
                        <Square className="mr-2 h-4 w-4" />
                        End Debate
                     </Button>
                  </div>
               )}

               {transcription.length > 0 && (
                  <div className="space-y-4">
                     <div className="space-y-2">
                        <h3 className="font-semibold">Debate Transcript</h3>
                        <div className="border rounded-lg p-4 h-48 overflow-y-auto">
                           {translatedTranscription.length > 0
                              ? translatedTranscription.map(
                                   (segment, index) => (
                                      <div key={index} className="mb-2">
                                         <span className="font-medium">
                                            {getSpeakerLabel(
                                               segment.speaker as
                                                  | "person1"
                                                  | "person2"
                                            )}
                                            :
                                         </span>
                                         <span className="ml-2 text-muted-foreground">
                                            {segment.text}
                                         </span>
                                      </div>
                                   )
                                )
                              : transcription.map((segment, index) => (
                                   <div key={index} className="mb-2">
                                      <span className="font-medium">
                                         {getSpeakerLabel(
                                            segment.speaker as
                                               | "person1"
                                               | "person2"
                                         )}
                                         :
                                      </span>
                                      <span className="ml-2 text-muted-foreground">
                                         {segment.text}
                                      </span>
                                   </div>
                                ))}
                        </div>
                     </div>

                     {!isRecording && (
                        <Button className="w-full" onClick={analyzeDebate}>
                           Analyze Debate
                        </Button>
                     )}
                  </div>
               )}

               {analysis && (
                  <div className="grid gap-6">
                     <WinnerBanner
                        winner={analysis.total.winner}
                        scores={{
                           person1: analysis.total.person1,
                           person2: analysis.total.person2,
                        }}
                     />

                     <div className="border-t pt-6">
                        <div className="flex items-center justify-between mb-4">
                           <h3 className="text-xl font-semibold">
                              Blockchain Certification
                           </h3>
                           {txHash && (
                              <span className="text-sm text-muted-foreground">
                                 Transaction confirmed
                              </span>
                           )}
                        </div>

                        <div className="space-y-4">
                           <div className="p-4 bg-muted rounded-lg">
                              <div className="flex items-center justify-between">
                                 <div>
                                    <p className="font-medium">
                                       Debate ID: {debateId}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                       {topic}
                                    </p>
                                 </div>
                                 {txHash ? (
                                    <CheckCircle2 className="text-green-600 h-6 w-6" />
                                 ) : (
                                    <Button onClick={declareWinnerOnChain}>
                                       Certify Result on Blockchain
                                    </Button>
                                 )}
                              </div>

                              {txHash && (
                                 <div className="mt-4 p-3 bg-background rounded-md">
                                    <p className="text-sm break-all">
                                       Transaction Hash: {txHash}
                                    </p>
                                 </div>
                              )}
                           </div>
                        </div>
                     </div>

                     {["ethos", "pathos", "logos", "stoic", "facts"].map(
                        (aspect) => (
                           <div key={aspect} className="space-y-4">
                              <div className="flex justify-between items-center">
                                 <h3 className="font-semibold capitalize">
                                    {aspect}
                                 </h3>
                                 <span className="text-muted-foreground">
                                    Leader:{" "}
                                    {getSpeakerLabel(
                                       analysis[aspect]?.leading as
                                          | "person1"
                                          | "person2"
                                    )}
                                 </span>
                              </div>

                              {aspect !== "facts" ? (
                                 <>
                                    <div className="space-y-2">
                                       <div className="flex justify-between items-center">
                                          <span className="font-medium">
                                             {getSpeakerLabel("person1")}
                                          </span>
                                          <span>
                                             {analysis[
                                                aspect
                                             ]?.scores?.person1.toFixed(1)}
                                          </span>
                                       </div>
                                       <Progress
                                          value={getProgressValue(
                                             analysis[aspect]?.scores?.person1
                                          )}
                                          className="h-2"
                                       />
                                       <p className="text-sm text-muted-foreground">
                                          {
                                             analysis[aspect]?.explanations
                                                ?.person1
                                          }
                                       </p>
                                    </div>

                                    <div className="space-y-2">
                                       <div className="flex justify-between items-center">
                                          <span className="font-medium">
                                             {getSpeakerLabel("person2")}
                                          </span>
                                          <span>
                                             {analysis[
                                                aspect
                                             ]?.scores?.person2.toFixed(1)}
                                          </span>
                                       </div>
                                       <Progress
                                          value={getProgressValue(
                                             analysis[aspect]?.scores?.person2
                                          )}
                                          className="h-2"
                                       />
                                       <p className="text-sm text-muted-foreground">
                                          {
                                             analysis[aspect]?.explanations
                                                ?.person2
                                          }
                                       </p>
                                    </div>
                                 </>
                              ) : (
                                 <div className="space-y-4">
                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                       <div className="bg-green-50 p-4 rounded-lg">
                                          <div className="flex items-center gap-2">
                                             <CheckCircle2 className="text-green-600 h-5 w-5" />
                                             <span className="font-semibold">
                                                Supported:{" "}
                                                {
                                                   analysis?.facts?.all_claims?.filter(
                                                      (c: any) =>
                                                         c?.verdict ===
                                                         "supported"
                                                   ).length
                                                }
                                             </span>
                                          </div>
                                       </div>
                                       <div className="bg-red-50 p-4 rounded-lg">
                                          <div className="flex items-center gap-2">
                                             <AlertTriangle className="text-red-600 h-5 w-5" />
                                             <span className="font-semibold">
                                                Contradicted:{" "}
                                                {
                                                   analysis?.facts?.incorrect_claims?.filter(
                                                      (c: any) =>
                                                         c.verdict ===
                                                         "contradicted"
                                                   ).length
                                                }
                                             </span>
                                          </div>
                                       </div>
                                       <div className="bg-yellow-50 p-4 rounded-lg">
                                          <div className="flex items-center gap-2">
                                             <AlertTriangle className="text-yellow-600 h-5 w-5" />
                                             <span className="font-semibold">
                                                Unverified:{" "}
                                                {
                                                   analysis?.facts?.all_claims?.filter(
                                                      (c: any) =>
                                                         c?.verdict ===
                                                         "unverified"
                                                   ).length
                                                }
                                             </span>
                                          </div>
                                       </div>
                                    </div>

                                    <h4 className="font-medium">
                                       Detailed Fact Checks:
                                    </h4>
                                    {analysis?.facts?.all_claims?.map(
                                       (claim: any, index: any) => (
                                          <div
                                             key={index}
                                             className="p-4 border rounded-lg"
                                          >
                                             <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                   <div className="flex items-center gap-2 mb-2">
                                                      {claim.verdict ===
                                                      "supported" ? (
                                                         <CheckCircle2 className="text-green-500 h-4 w-4" />
                                                      ) : claim.verdict ===
                                                        "contradicted" ? (
                                                         <AlertTriangle className="text-red-500 h-4 w-4" />
                                                      ) : (
                                                         <AlertTriangle className="text-yellow-500 h-4 w-4" />
                                                      )}
                                                      <span className="font-medium">
                                                         {claim.claim}
                                                      </span>
                                                   </div>
                                                   <p className="text-sm text-muted-foreground">
                                                      {claim.summary}
                                                   </p>
                                                   {claim.context && (
                                                      <p className="text-xs text-muted-foreground mt-2 italic">
                                                         {claim.context}
                                                      </p>
                                                   )}
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                   <div className="flex items-center gap-2">
                                                      <span
                                                         className={`text-sm font-medium ${
                                                            claim.verdict ===
                                                            "supported"
                                                               ? "text-green-600"
                                                               : claim.verdict ===
                                                                 "contradicted"
                                                               ? "text-red-600"
                                                               : "text-yellow-600"
                                                         }`}
                                                      >
                                                         {claim.verdict}
                                                      </span>
                                                      <div className="w-20">
                                                         <Progress
                                                            value={
                                                               (claim.confidence /
                                                                  10) *
                                                               100
                                                            }
                                                            className={`h-2 ${
                                                               claim.verdict ===
                                                               "supported"
                                                                  ? "bg-green-100"
                                                                  : claim.verdict ===
                                                                    "contradicted"
                                                                  ? "bg-red-100"
                                                                  : "bg-yellow-100"
                                                            }`}
                                                         />
                                                      </div>
                                                   </div>
                                                   <span className="text-xs text-muted-foreground">
                                                      Confidence:{" "}
                                                      {claim.confidence}/10
                                                   </span>
                                                </div>
                                             </div>
                                          </div>
                                       )
                                    )}
                                 </div>
                              )}
                           </div>
                        )
                     )}
                  </div>
               )}
            </CardContent>
         </Card>
      </div>
   );
}
