const prisma = require("../db/prisma");
const { paginationSchema } = require("../validation/paginationSchema");

/**
 * Returns task completion stats, recent tasks, and weekly progress for a user
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function getUserAnalytics(req, res, next) {
  const userId = parseInt(req.params.id, 10);
  if (Number.isNaN(userId)) {
    return res.status(400).json({ message: "The user ID passed is not valid." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      return res.status(404).json({ message: "The user was not found." });
    }

    const taskStats = await prisma.task.groupBy({
      by: ["isCompleted"],
      where: { userId },
      _count: {
        id: true,
      },
    });

    const recentTasks = await prisma.task.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
        createdAt: true,
        userId: true,
        User: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weeklyProgress = await prisma.task.groupBy({
      by: ["createdAt"],
      where: {
        userId,
        createdAt: { gte: oneWeekAgo },
      },
      _count: { id: true },
    });

    res.status(200).json({ taskStats, recentTasks, weeklyProgress });
  } catch (e) {
    return next(e);
  }
}

/**
 * Lists all users with their task counts (paginated)
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function getUsersWithStats(req, res, next) {
  const { error: paginationError, value: paginationValue } = paginationSchema.validate({
    page: req.query.page,
    limit: req.query.limit,
  });
  if (paginationError) {
    return res.status(400).json({ message: paginationError.message });
  }
  const { page, limit } = paginationValue;
  const skip = (page - 1) * limit;

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        Task: {
          where: { isCompleted: false },
          select: { id: true },
          take: 5,
        },
        _count: {
          select: {
            Task: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.user.count();
    const pages = Math.ceil(total / limit);
    const pagination = {
      page,
      limit,
      total,
      pages,
      hasNext: page * limit < total,
      hasPrev: page > 1,
    };

    res.status(200).json({ users, pagination });
  } catch (e) {
    return next(e);
  }
}

/**
 * Searches tasks and user names using raw SQL with relevance ranking
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
async function searchTasks(req, res, next) {
  const searchQuery = req.query.q;

  if (!searchQuery || searchQuery.trim().length < 2) {
    return res.status(400).json({
      error: "Search query must be at least 2 characters long",
    });
  }

  const limit = req.query.limit === undefined ? 20 : parseInt(req.query.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({ error: "limit must be an integer between 1 and 100" });
  }

  const searchPattern = `%${searchQuery}%`;
  const exactMatch = searchQuery;
  const startsWith = `${searchQuery}%`;

  try {
    const searchResults = await prisma.$queryRaw`
      SELECT
        t.id,
        t.title,
        t.is_completed as "isCompleted",
        t.priority,
        t.created_at as "createdAt",
        t.user_id as "userId",
        u.name as "user_name"
      FROM tasks t
      JOIN users u ON t.user_id = u.id
      WHERE t.title ILIKE ${searchPattern}
         OR u.name ILIKE ${searchPattern}
      ORDER BY
        CASE
          WHEN t.title ILIKE ${exactMatch} THEN 1
          WHEN t.title ILIKE ${startsWith} THEN 2
          WHEN t.title ILIKE ${searchPattern} THEN 3
          ELSE 4
        END,
        t.created_at DESC
      LIMIT ${limit}
    `;

    res.status(200).json({
      results: searchResults,
      query: searchQuery,
      count: searchResults.length,
    });
  } catch (e) {
    return next(e);
  }
}

module.exports = {
  getUserAnalytics,
  getUsersWithStats,
  searchTasks,
};
