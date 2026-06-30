-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security on all public tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Activity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActivityLike" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActivityComment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Workout" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Group" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Establishment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Badge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HeartRateLog" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "Goal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PersonalBest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DailyTask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HealthMetric" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GroupInvite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GroupMessage" ENABLE ROW LEVEL SECURITY;

-- 1. User Table Policies
CREATE POLICY "Users are viewable by everyone" ON "User" FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON "User" FOR INSERT WITH CHECK (auth.uid()::text = id);
CREATE POLICY "Users can update own profile" ON "User" FOR UPDATE USING (auth.uid()::text = id);

-- 2. Activity Table Policies
CREATE POLICY "Activities viewable by everyone" ON "Activity" FOR SELECT USING (true);
CREATE POLICY "Users can insert own activities" ON "Activity" FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Users can update own activities" ON "Activity" FOR UPDATE USING (auth.uid()::text = "userId");
CREATE POLICY "Users can delete own activities" ON "Activity" FOR DELETE USING (auth.uid()::text = "userId");

-- 3. ActivityLike Policies
CREATE POLICY "Likes viewable by everyone" ON "ActivityLike" FOR SELECT USING (true);
CREATE POLICY "Users can insert own likes" ON "ActivityLike" FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Users can delete own likes" ON "ActivityLike" FOR DELETE USING (auth.uid()::text = "userId");

-- 4. ActivityComment Policies
CREATE POLICY "Comments viewable by everyone" ON "ActivityComment" FOR SELECT USING (true);
CREATE POLICY "Users can insert own comments" ON "ActivityComment" FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Users can delete own comments" ON "ActivityComment" FOR DELETE USING (auth.uid()::text = "userId");

-- 5. Message Policies (Chat)
CREATE POLICY "Users can view their messages" ON "Message" FOR SELECT USING (auth.uid()::text = "senderId" OR auth.uid()::text = "receiverId");
CREATE POLICY "Users can send messages" ON "Message" FOR INSERT WITH CHECK (auth.uid()::text = "senderId");

-- 6. Goal, PB, Task, HealthMetric (Private to user)
CREATE POLICY "Users can view own goals" ON "Goal" FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Users can insert own goals" ON "Goal" FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Users can update own goals" ON "Goal" FOR UPDATE USING (auth.uid()::text = "userId");
CREATE POLICY "Users can delete own goals" ON "Goal" FOR DELETE USING (auth.uid()::text = "userId");

CREATE POLICY "Users can view own PB" ON "PersonalBest" FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Users can insert own PB" ON "PersonalBest" FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Users can update own PB" ON "PersonalBest" FOR UPDATE USING (auth.uid()::text = "userId");
CREATE POLICY "Users can delete own PB" ON "PersonalBest" FOR DELETE USING (auth.uid()::text = "userId");

CREATE POLICY "Users can view own Tasks" ON "DailyTask" FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Users can insert own Tasks" ON "DailyTask" FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Users can update own Tasks" ON "DailyTask" FOR UPDATE USING (auth.uid()::text = "userId");
CREATE POLICY "Users can delete own Tasks" ON "DailyTask" FOR DELETE USING (auth.uid()::text = "userId");

CREATE POLICY "Users can view own Metrics" ON "HealthMetric" FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Users can insert own Metrics" ON "HealthMetric" FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Users can update own Metrics" ON "HealthMetric" FOR UPDATE USING (auth.uid()::text = "userId");
CREATE POLICY "Users can delete own Metrics" ON "HealthMetric" FOR DELETE USING (auth.uid()::text = "userId");

-- 7. Group Messages and Invites
CREATE POLICY "GroupMessages viewable by everyone" ON "GroupMessage" FOR SELECT USING (true);
CREATE POLICY "Users can send group messages" ON "GroupMessage" FOR INSERT WITH CHECK (auth.uid()::text = "senderId");

CREATE POLICY "Invites viewable by sender or receiver" ON "GroupInvite" FOR SELECT USING (auth.uid()::text = "senderId" OR auth.uid()::text = "receiverId");
CREATE POLICY "Users can send invites" ON "GroupInvite" FOR INSERT WITH CHECK (auth.uid()::text = "senderId");
CREATE POLICY "Receivers can update invites" ON "GroupInvite" FOR UPDATE USING (auth.uid()::text = "receiverId");

-- 8. Trigger to sync auth.users to public.User
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public."User" (id, email, name, "createdAt")
  VALUES (
    new.id::text, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Unknown User'),
    new.created_at
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Turn on Realtime for relevant tables
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE "Message", "Activity", "ActivityLike", "ActivityComment", "GroupMessage";
COMMIT;
