import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { components } from "./_generated/api";
import { domainBot } from "./agent";

// ============================================
// Agent-based Thread Management (New)
// ============================================

/**
 * Create a new thread using the agent plugin
 */
export const create = action({
  args: {
    userId: v.id("users"),
    title: v.optional(v.string()),
  },
  handler: async (ctx, { userId, title }) => {
    const { threadId } = await domainBot.createThread(ctx, {
      metadata: {
        userId: userId.toString(),
        title: title ?? "New conversation",
      },
    });
    return threadId;
  },
});

/**
 * List threads for a user from the agent plugin
 */
export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // Query the agent's threads table
    const threads = await ctx.runQuery(
      components.agent.threads.listThreadsByUserId,
      {
        userId: userId.toString(),
        order: "desc",
      }
    );

    // Map to our expected format
    return threads.page.map((t) => ({
      _id: t._id,
      _creationTime: t._creationTime,
      title: (t.metadata as { title?: string })?.title ?? "Untitled",
      userId: userId,
      createdAt: t._creationTime,
      updatedAt: t._creationTime,
    }));
  },
});

/**
 * Get a single thread
 */
export const get = query({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId,
    });

    if (!thread) return null;

    return {
      _id: thread._id,
      _creationTime: thread._creationTime,
      title: (thread.metadata as { title?: string })?.title ?? "Untitled",
      createdAt: thread._creationTime,
      updatedAt: thread._creationTime,
    };
  },
});

/**
 * Get messages for a thread from the agent plugin
 */
export const getMessages = query({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    const messages = await ctx.runQuery(
      components.agent.messages.listMessagesByThreadId,
      {
        threadId,
        order: "asc",
      }
    );

    // Map to our expected format
    return messages.page
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        _id: m._id,
        _creationTime: m._creationTime,
        threadId,
        role: m.role as "user" | "assistant",
        content: m.message?.content ?? "",
        toolCalls: m.message?.toolCalls?.map((tc) => ({
          id: tc.toolCallId,
          name: tc.toolName,
          input: tc.args,
        })),
        toolResults: m.message?.toolResults?.map((tr) => ({
          toolCallId: tr.toolCallId,
          result: tr.result,
        })),
        createdAt: m._creationTime,
      }));
  },
});

/**
 * Update thread title
 */
export const updateTitle = mutation({
  args: {
    threadId: v.string(),
    title: v.string(),
  },
  handler: async (ctx, { threadId, title }) => {
    // Get current thread to preserve metadata
    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId,
    });

    if (thread) {
      await ctx.runMutation(components.agent.threads.updateThread, {
        threadId,
        metadata: {
          ...(thread.metadata as object),
          title,
        },
      });
    }
  },
});

// Note: addMessage is no longer needed - the agent handles message storage automatically
// when you call domainBot.generateText() or domainBot.chat()
